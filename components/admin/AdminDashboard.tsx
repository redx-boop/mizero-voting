"use client";

// ============================================================================
// AdminDashboard — the tabbed admin interface.
//
// Receives ALL data from the /admin server component (which already verified
// the user is an admin). Tabs switch between the management screens; every
// save/edit calls a server action and then router.refresh() to re-render the
// server components with fresh data.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Eye,
  EyeOff,
  FolderKanban,
  LayoutDashboard,
  Lock,
  Play,
  RotateCcw,
  Settings2,
  Square,
  UserSearch,
  Users,
} from "lucide-react";
import type {
  Candidate,
  Category,
  CategoryResultWithMeta,
  ElectionStatus,
  Profile,
  Settings,
} from "@/lib/types";
import { getStatusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import {
  closeVoting,
  openVoting,
  resetElection,
  setResultsVisibility,
} from "@/app/actions/admin";
import CategoryManager from "@/components/admin/CategoryManager";
import CandidateManager from "@/components/admin/CandidateManager";
import ElectionSettings from "@/components/admin/ElectionSettings";
import VoterManager from "@/components/admin/VoterManager";
import ResultsChart from "@/components/ResultsChart";

export interface AdminStats {
  students: number;
  votes: number;
  activeCategories: number;
  candidates: number;
}

type TabId =
  | "overview"
  | "categories"
  | "candidates"
  | "voters"
  | "results"
  | "settings";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "categories", label: "Categories", icon: FolderKanban },
  { id: "candidates", label: "Candidates", icon: Users },
  { id: "voters", label: "Voters", icon: UserSearch },
  { id: "results", label: "Results", icon: BarChart3 },
  { id: "settings", label: "Election", icon: Settings2 },
];

export default function AdminDashboard({
  profile,
  stats,
  categories,
  candidates,
  settings,
  status,
  results,
}: {
  profile: Profile;
  stats: AdminStats;
  categories: Category[];
  candidates: Candidate[];
  settings: Settings;
  status: ElectionStatus;
  results: Record<string, CategoryResultWithMeta[]>;
}) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Signed in as <strong>{profile.full_name}</strong> · manage the
          election, categories, candidates and results.
        </p>
      </header>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-primary-soft bg-surface p-1.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-primary text-white shadow-sm"
                : "text-ink-soft hover:bg-mist hover:text-ink"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Overview
          stats={stats}
          settings={settings}
          status={status}
          categoryCount={categories.length}
        />
      )}
      {tab === "categories" && (
        <CategoryManager categories={categories} candidateCounts={candidateCounts(candidates)} />
      )}
      {tab === "candidates" && (
        <CandidateManager categories={categories} candidates={candidates} />
      )}
      {tab === "voters" && <VoterManager />}
      {tab === "results" && (
        <div className="space-y-6">
          {Object.keys(results).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary-soft bg-surface p-10 text-center">
              <p className="text-4xl">📊</p>
              <p className="mt-3 font-semibold text-ink">No results yet</p>
              <p className="mt-1 text-sm text-ink-soft">
                Vote counts will appear here as students cast their ballots.
              </p>
            </div>
          ) : (
            Object.entries(results).map(([categoryId, rows]) => (
              <ResultsChart
                key={categoryId}
                categoryName={rows[0]?.category_name ?? "Category"}
                results={rows}
              />
            ))
          )}
        </div>
      )}
      {tab === "settings" && <ElectionSettings settings={settings} status={status} />}
    </div>
  );
}

function candidateCounts(candidates: Candidate[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of candidates) counts[c.category_id] = (counts[c.category_id] ?? 0) + 1;
  return counts;
}

function Overview({
  stats,
  settings,
  status,
  categoryCount,
}: {
  stats: AdminStats;
  settings: Settings;
  status: ElectionStatus;
  categoryCount: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setMessage(null);
    const result = await action();
    if (!result.ok) setMessage({ ok: false, text: result.error ?? "Action failed." });
    router.refresh();
  }

  async function handleReset() {
    setConfirmReset(false);
    setResetting(true);
    setMessage(null);
    const result = await resetElection();
    setResetting(false);
    setMessage(
      result.ok
        ? { ok: true, text: "Election reset — all votes cleared and voting is closed. Reopen it when you're ready." }
        : { ok: false, text: result.error ?? "Reset failed." }
    );
    router.refresh();
  }

  const cards = [
    { label: "Total students", value: stats.students, icon: Users },
    { label: "Total votes", value: stats.votes, icon: BarChart3 },
    { label: "Active categories", value: stats.activeCategories, icon: FolderKanban },
    { label: "Total candidates", value: stats.candidates, icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-primary-soft bg-surface p-5 shadow-sm"
          >
            <card.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-extrabold tabular-nums text-ink">
              {card.value}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {message && (
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium",
            message.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          )}
        >
          {message.text}
        </p>
      )}

      {/* Election status + quick controls */}
      <div className="rounded-2xl border border-primary-soft bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink">Election status</h2>
            <p className="mt-1 text-sm text-ink-soft">{getStatusLabel(status)}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {settings.voting_start
                ? `Opens: ${new Date(settings.voting_start).toLocaleString()}`
                : "No start time set"}
              {" · "}
              {settings.voting_end
                ? `Closes: ${new Date(settings.voting_end).toLocaleString()}`
                : "no end time"}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {status !== "active" ? (
            <button
              onClick={() => run(openVoting)}
              className="flex items-center justify-center gap-2 rounded-xl bg-success px-4 py-3 font-semibold text-white transition-colors hover:brightness-95"
            >
              <Play className="h-4 w-4" /> Open voting now
            </button>
          ) : (
            <button
              onClick={() => run(closeVoting)}
              className="flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-3 font-semibold text-white transition-colors hover:brightness-95"
            >
              <Square className="h-4 w-4" /> Close voting now
            </button>
          )}

          {settings.results_visibility !== "visible" ? (
            <button
              onClick={() => run(() => setResultsVisibility("visible"))}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <Eye className="h-4 w-4" /> Publish results
            </button>
          ) : (
            <button
              onClick={() => run(() => setResultsVisibility("after_close"))}
              className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary-soft"
            >
              <EyeOff className="h-4 w-4" /> Hide results until close
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
          <Lock className="h-3.5 w-3.5" />
          Results visibility:{" "}
          <strong className="text-ink">
            {settings.results_visibility === "after_close"
              ? "students see results after voting closes"
              : settings.results_visibility}
          </strong>
          {categoryCount === 0 && (
            <span className="ml-1">· Add categories to get started!</span>
          )}
        </div>
      </div>

      {/* Danger zone: reset the election for a fresh start */}
      <div className="rounded-2xl border border-danger/25 bg-danger-soft/50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-md">
            <h2 className="flex items-center gap-2 font-bold text-danger">
              <RotateCcw className="h-5 w-5" />
              Reset election
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Wipe every vote, clear the voting window and hide results again —
              a fresh start for the next election. Categories, candidates and
              photos are kept.
            </p>
          </div>

          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                {resetting ? "Resetting…" : "Yes, reset everything"}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset election
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
