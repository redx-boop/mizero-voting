import type { Metadata } from "next";
import { EyeOff, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { canSeeResults, getElectionStatus } from "@/lib/status";
import { groupResults } from "@/lib/results";
import type { CategoryResult, Settings } from "@/lib/types";
import WinnersReveal, { type WinnerCategory } from "@/components/WinnersReveal";
import StatusBadge from "@/components/StatusBadge";

export const metadata: Metadata = { title: "Winners" };

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  election_name: "Mizero Awards",
  election_year: "2026",
  voting_start: null,
  voting_end: null,
  results_visibility: "after_close",
  allow_registration: true,
  updated_at: "",
};

// ============================================================================
// /winners — Server Component.
//
// Announces the winner of every category with a celebration. It uses the same
// visibility rules as /results: the admin decides whether students see
// winners at all, only after voting closes, or at any time. Admins always
// see the winners. Winner data comes from get_category_results() — the same
// aggregated, privacy-safe database function the results page uses.
// ============================================================================

export default async function WinnersPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("settings").select("*").single();
  const electionSettings = (settings as Settings | null) ?? DEFAULT_SETTINGS;
  const status = getElectionStatus(electionSettings);

  // Admins always see winners; students follow the visibility setting.
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  const isAdmin = profile?.role === "admin";
  const visible = isAdmin || canSeeResults(electionSettings, status);

  if (!visible) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-primary-soft bg-surface p-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-dark">
            {electionSettings.results_visibility === "hidden" ? (
              <EyeOff className="h-7 w-7" />
            ) : (
              <Lock className="h-7 w-7" />
            )}
          </span>
          <h1 className="mt-4 text-xl font-bold text-ink">Winners are a surprise!</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {electionSettings.results_visibility === "hidden"
              ? "The organizers are keeping the winners under wraps for now."
              : "The winners will be announced once voting has ended."}
          </p>
          <div className="mt-4 flex justify-center">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>
    );
  }

  // Fetch the aggregated counts and pick the winner of each category.
  const { data } = await supabase.rpc("get_category_results");
  const grouped = groupResults((data as CategoryResult[] | null) ?? []);

  const winnerCategories: WinnerCategory[] = Object.values(grouped)
    .map((rows) => ({
      categoryId: rows[0].category_id,
      categoryName: rows[0].category_name,
      winner: rows[0],
      runnersUp: rows.slice(1, 3),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  const totalVotes = winnerCategories.reduce(
    (sum, category) => sum + category.winner.total_votes,
    0
  );

  if (winnerCategories.length === 0 || totalVotes === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-dashed border-primary-soft bg-surface p-10 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 text-xl font-bold text-ink">No winners yet</h1>
          <p className="mt-1 text-sm text-ink-soft">
            The winners will be revealed once students cast their ballots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <WinnersReveal
      electionName={electionSettings.election_name}
      electionYear={electionSettings.election_year}
      categories={winnerCategories}
      totalVotes={totalVotes}
    />
  );
}
