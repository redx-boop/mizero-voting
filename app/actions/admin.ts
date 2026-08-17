"use server";

// ============================================================================
// Admin Server Actions — the only way the admin dashboard changes data.
//
// Every action starts with getAdminProfile() which looks the CURRENT user's
// role up from the database. A student who somehow calls one of these gets
// an error — the role is never trusted from the client. Input is validated
// server-side before touching the database.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth";
import type { ResultsVisibility } from "@/lib/types";

export interface AdminResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function cleanText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

/** Pick a slug that is not already used by another category. */
async function uniqueSlug(base: string): Promise<string> {
  const supabase = await createClient();
  let slug = base || "category";
  let attempt = 2;
  for (;;) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${base || "category"}-${attempt++}`;
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(input: {
  name: string;
  description?: string;
  icon?: string;
  voting_start?: string | null;
  voting_end?: string | null;
}): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const name = cleanText(input.name, 80);
  if (name.length < 2) return { ok: false, error: "Category name is too short." };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name,
    slug: await uniqueSlug(slugify(name)),
    description: cleanText(input.description, 300) || null,
    icon: cleanText(input.icon, 12) || "🏆",
    voting_start: input.voting_start || null,
    voting_end: input.voting_end || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    description?: string;
    icon?: string;
    voting_start?: string | null;
    voting_end?: string | null;
  }
): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const name = cleanText(input.name, 80);
  if (name.length < 2) return { ok: false, error: "Category name is too short." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name,
      description: cleanText(input.description, 300) || null,
      icon: cleanText(input.icon, 12) || "🏆",
      voting_start: input.voting_start || null,
      voting_end: input.voting_end || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCategoryActive(
  id: string,
  isActive: boolean
): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      error: "This category already has votes — deactivate it instead of deleting it.",
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export async function createCandidate(input: {
  category_id: string;
  name: string;
  description?: string;
  class_name?: string;
  photo_url?: string | null;
}): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const name = cleanText(input.name, 80);
  if (name.length < 2) return { ok: false, error: "Candidate name is too short." };

  const supabase = await createClient();

  // Category must exist.
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", input.category_id)
    .maybeSingle();
  if (!category) return { ok: false, error: "Choose a valid category." };

  const { error } = await supabase.from("candidates").insert({
    category_id: input.category_id,
    name,
    description: cleanText(input.description, 300) || null,
    class_name: cleanText(input.class_name, 60) || null,
    photo_url: input.photo_url || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCandidate(
  id: string,
  input: {
    category_id: string;
    name: string;
    description?: string;
    class_name?: string;
    photo_url?: string | null;
  }
): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const name = cleanText(input.name, 80);
  if (name.length < 2) return { ok: false, error: "Candidate name is too short." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("candidates")
    .update({
      category_id: input.category_id,
      name,
      description: cleanText(input.description, 300) || null,
      class_name: cleanText(input.class_name, 60) || null,
      photo_url: input.photo_url || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCandidate(id: string): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      error: "This candidate already has votes and cannot be removed.",
    };
  }

  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Election settings & controls
// ---------------------------------------------------------------------------

const VISIBILITY: ResultsVisibility[] = ["hidden", "visible", "after_close"];

export async function updateSettings(input: {
  election_name: string;
  election_year: string;
  voting_start: string | null;
  voting_end: string | null;
  results_visibility: ResultsVisibility;
  allow_registration: boolean;
}): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  if (!VISIBILITY.includes(input.results_visibility)) {
    return { ok: false, error: "Invalid results visibility." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      election_name: cleanText(input.election_name, 60) || "Mizero Awards",
      election_year: cleanText(input.election_year, 10) || "2026",
      voting_start: input.voting_start || null,
      voting_end: input.voting_end || null,
      results_visibility: input.results_visibility,
      allow_registration: input.allow_registration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** One-click "open the election now". */
export async function openVoting(): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const { data: settings } = await supabase.from("settings").select("*").single();

  const now = new Date().toISOString();
  const end = settings?.voting_end ? new Date(settings.voting_end) : null;
  // If the configured end date already passed, clear it so voting stays open.
  const votingEnd = end && end < new Date() ? null : (settings?.voting_end ?? null);

  const { error } = await supabase
    .from("settings")
    .update({ voting_start: now, voting_end: votingEnd, updated_at: now })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** One-click "close the election now". */
export async function closeVoting(): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("settings")
    .update({ voting_end: now, updated_at: now })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setResultsVisibility(
  visibility: ResultsVisibility
): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };
  if (!VISIBILITY.includes(visibility)) {
    return { ok: false, error: "Invalid results visibility." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ results_visibility: visibility, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Voter management — find a student and reset their votes
// ---------------------------------------------------------------------------
// Deleting a vote is safe: the UNIQUE(user_id, category_id) constraint only
// blocks a SECOND vote, so once a vote is removed the student can simply
// vote again in that category. The RLS policy "admins can delete votes"
// (see supabase/schema.sql) is what permits these deletions.

/** A compact profile row returned to the admin search. */
export interface StudentSearchResult {
  id: string;
  full_name: string;
  student_id: string | null;
  class_name: string | null;
}

/** One vote with the category and candidate names filled in. */
export interface StudentVote {
  id: string;
  category_id: string;
  category_name: string;
  category_icon: string | null;
  candidate_id: string;
  candidate_name: string;
  created_at: string;
}

export type StudentSearchResponse = {
  ok: boolean;
  error?: string;
  students?: StudentSearchResult[];
};

export type StudentVotesResponse = {
  ok: boolean;
  error?: string;
  votes?: StudentVote[];
};

/** Escape LIKE wildcards so user input matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Search students by name, student ID or class.
 * (Emails are not searchable — they live in auth.users, which the app's
 * anon key cannot read by design.)
 */
export async function searchStudents(
  query: string
): Promise<StudentSearchResponse> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const q = query.trim();
  if (q.length < 2) {
    return { ok: false, error: "Type at least 2 characters to search." };
  }

  const supabase = await createClient();
  const safe = escapeLike(q);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, student_id, class_name")
    .or(
      `full_name.ilike.%${safe}%,student_id.ilike.%${safe}%,class_name.ilike.%${safe}%`
    )
    .order("full_name")
    .limit(10);

  if (error) return { ok: false, error: error.message };
  return { ok: true, students: (data as StudentSearchResult[] | null) ?? [] };
}

/** Fetch one student's ballot with readable category and candidate names. */
export async function getStudentVotes(
  userId: string
): Promise<StudentVotesResponse> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  // Embedded resources follow the foreign keys from votes → categories / candidates.
  const { data, error } = await supabase
    .from("votes")
    .select(
      "id, created_at, categories(id, name, icon), candidates(id, name)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  // A related row can come back as an object or a single-element array
  // depending on the API response — handle both shapes defensively.
  type RelatedRow<T> = T | T[] | null;
  type VoteRow = {
    id: string;
    created_at: string;
    categories: RelatedRow<{ id: string; name: string; icon: string | null }>;
    candidates: RelatedRow<{ id: string; name: string }>;
  };

  const votes: StudentVote[] = ((data ?? []) as unknown as VoteRow[]).map((vote) => {
    const category = Array.isArray(vote.categories) ? vote.categories[0] : vote.categories;
    const candidate = Array.isArray(vote.candidates) ? vote.candidates[0] : vote.candidates;
    return {
      id: vote.id,
      category_id: category?.id ?? "",
      category_name: category?.name ?? "Unknown category",
      category_icon: category?.icon ?? "🏆",
      candidate_id: candidate?.id ?? "",
      candidate_name: candidate?.name ?? "Unknown candidate",
      created_at: vote.created_at,
    };
  });

  return { ok: true, votes };
}

/** Reset ONE vote so the student can vote again in that category. */
export async function resetVote(voteId: string): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const { error } = await supabase.from("votes").delete().eq("id", voteId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Reset EVERY vote a student has cast. */
export async function resetAllStudentVotes(
  userId: string
): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const { error } = await supabase.from("votes").delete().eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reset the whole election (post-election cleanup)
// ---------------------------------------------------------------------------

/**
 * Reset the election for a fresh start after voting has finished:
 *
 *   • deletes EVERY vote — the UNIQUE(user_id, category_id) constraint stays,
 *     so students can simply vote again in every category
 *   • closes the election (voting_end = now) until the admin reopens it
 *   • resets results visibility back to "after_close"
 *   • clears any per-category voting windows
 *
 * Categories, candidates, photos, the election name and registration setting
 * are KEPT — the admin curates those between elections.
 */
export async function resetElection(): Promise<AdminResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: "Only administrators can do that." };

  const supabase = await createClient();
  const now = new Date().toISOString();
  // PostgREST refuses unfiltered deletes as a safety measure, so target an id
  // that can never exist to match every row.
  const impossibleId = "00000000-0000-0000-0000-000000000000";

  // 1) Wipe every ballot.
  const { error: votesError } = await supabase
    .from("votes")
    .delete()
    .neq("id", impossibleId);
  if (votesError) return { ok: false, error: votesError.message };

  // 2) Close the election and hide results until the next one ends.
  const { error: settingsError } = await supabase
    .from("settings")
    .update({
      voting_start: null,
      voting_end: now,
      results_visibility: "after_close",
      updated_at: now,
    })
    .eq("id", 1);
  if (settingsError) return { ok: false, error: settingsError.message };

  // 3) Clear any per-category voting windows.
  const { error: categoriesError } = await supabase
    .from("categories")
    .update({ voting_start: null, voting_end: null })
    .neq("id", impossibleId);
  if (categoriesError) return { ok: false, error: categoriesError.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
