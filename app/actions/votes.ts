"use server";

// ============================================================================
// Server Action: submitVotes
//
// The vote page lets students pick candidates in the browser, but the actual
// INSERT into the votes table happens HERE, on the server, where we can:
//   1. verify the user is logged in,
//   2. verify the election and every category is actually open,
//   3. verify each candidate exists, is active and belongs to its category,
//   4. hand the rows to PostgreSQL — whose UNIQUE(user_id, category_id)
//      constraint guarantees one vote per category, no matter what.
//
// Never trust the client: everything sent from the browser is re-validated.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getElectionStatus, isCategoryVotable } from "@/lib/status";
import type { Candidate, Category, Settings } from "@/lib/types";

export interface SubmitVotesResult {
  ok: boolean;
  error?: string;
  /** Category ids the user already voted in (used to refresh the UI). */
  alreadyVotedCategories?: string[];
}

export async function submitVotes(
  selections: Record<string, string>
): Promise<SubmitVotesResult> {
  const supabase = await createClient();

  // 1) Authenticate.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be logged in to vote." };
  }

  const categoryIds = Object.keys(selections);
  if (categoryIds.length === 0) {
    return { ok: false, error: "No selections were made." };
  }

  // 2) Load the data needed for validation.
  const [{ data: settings }, { data: categories }, { data: candidates }, { data: existingVotes }] =
    await Promise.all([
      supabase.from("settings").select("*").single(),
      supabase.from("categories").select("*"),
      supabase.from("candidates").select("*").eq("is_active", true),
      supabase.from("votes").select("category_id").eq("user_id", user.id),
    ]);

  const electionSettings = settings as Settings | null;
  const status = getElectionStatus(
    electionSettings ?? {
      id: 1,
      election_name: "Mizero Awards",
      election_year: "2026",
      voting_start: null,
      voting_end: null,
      results_visibility: "after_close",
      allow_registration: true,
      updated_at: "",
    }
  );

  // 3) Election must be open.
  if (status !== "active") {
    return { ok: false, error: "Voting is not open right now." };
  }

  const categoryMap = new Map(
    (categories as Category[] | null)?.map((c) => [c.id, c]) ?? []
  );
  const candidateMap = new Map(
    (candidates as Candidate[] | null)?.map((c) => [c.id, c]) ?? []
  );

  // 4) Friendly check: did the user already vote in some of these categories?
  const votedCategories = new Set(
    (existingVotes as { category_id: string }[] | null)?.map(
      (v) => v.category_id
    ) ?? []
  );
  const duplicates = categoryIds.filter((id) => votedCategories.has(id));
  if (duplicates.length > 0) {
    return {
      ok: false,
      error: "You have already voted in some of these categories.",
      alreadyVotedCategories: duplicates,
    };
  }

  // 5) Validate every selection server-side.
  const rows: { category_id: string; candidate_id: string; user_id: string }[] = [];
  for (const [categoryId, candidateId] of Object.entries(selections)) {
    const category = categoryMap.get(categoryId);
    const candidate = candidateMap.get(candidateId);

    if (!category || !isCategoryVotable(category, status)) {
      return { ok: false, error: "One of your categories is no longer open for voting." };
    }
    if (!candidate || candidate.category_id !== categoryId) {
      return { ok: false, error: "One of your selections is invalid." };
    }
    rows.push({
      category_id: categoryId,
      candidate_id: candidateId,
      user_id: user.id,
    });
  }

  // 6) Insert all votes in one request. If ANY row violates the unique
  //    (user_id, category_id) constraint — e.g. a double-click or a race
  //    between two tabs — PostgreSQL rejects the whole insert.
  const { error } = await supabase.from("votes").insert(rows);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "You have already voted in one of these categories.",
      };
    }
    return { ok: false, error: error.message };
  }

  // 7) Fresh data everywhere (homepage stats, results, admin).
  revalidatePath("/", "layout");
  return { ok: true };
}
