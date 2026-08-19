import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getElectionStatus } from "@/lib/status";
import type { Candidate, Category, Settings, Vote } from "@/lib/types";
import VoteSection from "@/components/VoteSection";

export const metadata: Metadata = { title: "Vote" };

// ============================================================================
// /vote — Server Component.
//
// Everything the voting UI needs is fetched HERE, server-side, using the
// logged-in user's session:
//   • the election settings (is voting open?)
//   • active categories + their active candidates
//   • the user's OWN existing votes (which categories are already locked)
// The data is passed down to the client VoteSection component.
// ============================================================================

export default async function VotePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  // Redirects to /login when there is no session.
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: settings }, { data: categories }, { data: candidates }, { data: votes }] =
    await Promise.all([
      supabase.from("settings").select("*").single(),
      supabase.from("categories").select("*").eq("is_active", true).order("created_at"),
      supabase
        .from("candidates")
        .select("*")
        .eq("is_active", true)
        .order("created_at"),
      supabase
        .from("votes")
        .select("category_id, candidate_id")
        .eq("user_id", user.id),
    ]);

  const electionSettings = (settings as Settings | null) ?? {
    id: 1,
    election_name: "Mizero Awards",
    election_year: "2026",
    voting_start: null,
    voting_end: null,
    results_visibility: "after_close" as const,
    allow_registration: true,
    updated_at: "",
  };
  const status = getElectionStatus(electionSettings);

  const categoryRows = (categories as Category[] | null) ?? [];
  const candidateRows = (candidates as Candidate[] | null) ?? [];
  const voteRows = (votes as Pick<Vote, "category_id" | "candidate_id">[] | null) ?? [];

  // Group candidates by category for the client.
  const candidatesByCategory: Record<string, Candidate[]> = {};
  for (const category of categoryRows) candidatesByCategory[category.id] = [];
  for (const candidate of candidateRows) {
    candidatesByCategory[candidate.category_id] ??= [];
    candidatesByCategory[candidate.category_id].push(candidate);
  }

  // Map of the user's existing votes: categoryId → candidateId.
  const existingVotes: Record<string, string> = {};
  for (const vote of voteRows) existingVotes[vote.category_id] = vote.candidate_id;
  const { category } = await searchParams;

  return (
    <VoteSection
      categories={categoryRows}
      candidatesByCategory={candidatesByCategory}
      existingVotes={existingVotes}
      status={status}
      initialCategoryId={category}
    />
  );
}
