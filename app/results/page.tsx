import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Crown, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { canSeeResults, getElectionStatus } from "@/lib/status";
import { groupResults } from "@/lib/results";
import type { CategoryResult, Settings } from "@/lib/types";
import ResultsChart from "@/components/ResultsChart";
import StatusBadge from "@/components/StatusBadge";

export const metadata: Metadata = { title: "Results" };

// ============================================================================
// /results — Server Component.
//
// The votes are private, so the page cannot read them directly (RLS). Instead
// it calls get_category_results(), a SECURITY DEFINER database function that
// returns only aggregated counts. Percentages and rankings are computed here
// on the server.
// ============================================================================

export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("settings").select("*").single();
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

  // Admins always see results; students follow the visibility setting.
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  const isAdmin = profile?.role === "admin";
  const visible = isAdmin || canSeeResults(electionSettings, status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
          <BarChart3 className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-3xl font-bold text-ink">Results</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">
          Live vote counts from the {electionSettings.election_name}{" "}
          {electionSettings.election_year} ballot.
        </p>
        <div className="mt-3 flex items-center justify-center">
          <StatusBadge status={status} />
        </div>
        {visible && (
          <div className="mt-4">
            <Link
              href="/winners"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-dark"
            >
              <Crown className="h-4 w-4" />
              See the winners
            </Link>
          </div>
        )}
      </header>

      {!visible ? (
        <div className="rounded-3xl border border-primary-soft bg-surface p-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-dark">
            {electionSettings.results_visibility === "hidden" ? (
              <EyeOff className="h-7 w-7" />
            ) : (
              <Lock className="h-7 w-7" />
            )}
          </span>
          <h2 className="mt-4 text-xl font-bold text-ink">Results are hidden</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {electionSettings.results_visibility === "hidden"
              ? "The organizers are keeping the results under wraps for now. Check back later!"
              : "Results will be revealed once voting has ended. Stay tuned!"}
          </p>
        </div>
      ) : (
        <ResultsBody />
      )}
    </div>
  );
}

/** Fetches the aggregated counts and renders each category's chart. */
async function ResultsBody() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_category_results");

  const rows = (data as CategoryResult[] | null) ?? [];
  const grouped = groupResults(rows);
  const categoryIds = Object.keys(grouped);
  const grandTotal = rows.reduce((sum, row) => sum + row.vote_count, 0);

  if (categoryIds.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-primary-soft bg-surface p-10 text-center">
        <p className="text-4xl">📊</p>
        <p className="mt-3 font-semibold text-ink">No results to show yet</p>
        <p className="mt-1 text-sm text-ink-soft">
          Once students start voting, their votes will appear here live.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary-soft bg-surface p-5 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-ink-soft">
          Total votes cast
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-primary">
          {grandTotal}
        </p>
      </div>

      {categoryIds.map((categoryId) => (
        <ResultsChart
          key={categoryId}
          categoryName={grouped[categoryId][0].category_name}
          results={grouped[categoryId]}
        />
      ))}
    </div>
  );
}
