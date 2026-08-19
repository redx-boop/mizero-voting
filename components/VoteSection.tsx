"use client";

// ============================================================================
// VoteSection — the interactive voting UI (client component).
//
// The server page passes the categories, candidates and the user's existing
// votes as props. This component keeps the in-progress selections in React
// state, then hands them to the submitVotes server action for the real,
// validated INSERT.
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCheck,
  PartyPopper,
  RefreshCw,
  Timer,
  Trophy,
} from "lucide-react";
import type { Candidate, Category, ElectionStatus } from "@/lib/types";
import { getCategoryStatus, getStatusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import CandidateCard from "@/components/CandidateCard";
import ReviewModal, { type ReviewItem } from "@/components/ReviewModal";
import StatusBadge from "@/components/StatusBadge";
import { submitVotes } from "@/app/actions/votes";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "done" };

export default function VoteSection({
  categories,
  candidatesByCategory,
  existingVotes,
  status,
}: {
  categories: Category[];
  candidatesByCategory: Record<string, Candidate[]>;
  /** categoryId → candidateId of votes this student already cast. */
  existingVotes: Record<string, string>;
  status: ElectionStatus;
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const candidateById = useMemo(() => {
    const map = new Map<string, Candidate>();
    for (const list of Object.values(candidatesByCategory)) {
      for (const candidate of list) map.set(candidate.id, candidate);
    }
    return map;
  }, [candidatesByCategory]);

  const now = new Date();
  const votable = categories.filter(
    (c) => getCategoryStatus(c, status, now) === "active"
  );
  const selectedCount = Object.keys(selections).length;

  function toggleSelection(categoryId: string, candidateId: string) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[categoryId] === candidateId) delete next[categoryId];
      else next[categoryId] = candidateId;
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitState({ kind: "submitting" });
    const result = await submitVotes(selections);
    if (result.ok) {
      setSubmitState({ kind: "done" });
      router.refresh(); // sync navbar / any stale data
    } else {
      setSubmitState({
        kind: "error",
        message: result.error ?? "Something went wrong. Please try again.",
      });
      // If some categories were already voted in, refresh to show that state.
      if (result.alreadyVotedCategories) {
        router.refresh();
      }
    }
  }

  // ---------- SUCCESS SCREEN ----------
  if (submitState.kind === "done") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="animate-pop-in rounded-3xl border border-primary-soft bg-surface p-8 shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-success-soft text-success">
            <PartyPopper className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-ink">
            🎉 Your votes have been submitted successfully!
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Thank you for taking part in the Mizero Awards. Your votes are
            safely stored and will be counted with everyone else&apos;s.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/results"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <Trophy className="h-4 w-4" />
              View results
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 px-5 py-3 font-semibold text-primary transition-colors hover:bg-primary-soft"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-ink">Cast your vote</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">
          Choose <strong>one candidate</strong> in each category, then review
          your ballot before submitting.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <StatusBadge status={status} />
        </div>
      </header>

      {/* Global "not open" banner */}
      {status !== "active" && (
        <div className="mb-8 flex flex-col items-center gap-2 rounded-2xl border border-accent/30 bg-accent-soft p-6 text-center">
          <Timer className="h-6 w-6 text-accent-dark" />
          <p className="font-semibold text-accent-dark">
            {getStatusLabel(status)}
          </p>
          <p className="text-sm text-accent-dark/80">
            {status === "closed"
              ? "The ballot is closed. Check the results page to see who won!"
              : "Come back when voting opens."}
          </p>
          {status === "closed" && (
            <Link
              href="/results"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <Trophy className="h-4 w-4" />
              View results
            </Link>
          )}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-soft bg-surface p-10 text-center">
          <p className="text-4xl">🗳️</p>
          <p className="mt-3 font-semibold text-ink">No categories yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Check back soon — the admin hasn&apos;t opened any categories.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((category) => {
            const categoryStatus = getCategoryStatus(category, status, now);
            const candidates = candidatesByCategory[category.id] ?? [];
            const alreadyVotedCandidateId = existingVotes[category.id];
            const isVotable = categoryStatus === "active" && !alreadyVotedCandidateId;

            return (
              <section
                key={category.id}
                className="rounded-2xl border border-primary-soft bg-surface p-5 shadow-sm sm:p-6"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary-soft text-xl">
                      {category.image_url ? (
                        <Image src={category.image_url} alt="" fill sizes="44px" className="object-cover" />
                      ) : (
                        category.icon ?? "🏆"
                      )}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-ink">{category.name}</h2>
                      {category.description && (
                        <p className="text-sm text-ink-soft">{category.description}</p>
                      )}
                    </div>
                  </div>

                  {alreadyVotedCandidateId ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      You have already voted in this category
                    </span>
                  ) : categoryStatus === "active" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                      Select one
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink-soft">
                      <Timer className="h-3.5 w-3.5" />
                      {categoryStatus === "not_started"
                        ? "Voting not started"
                        : "Voting closed"}
                    </span>
                  )}
                </div>

                {/* Candidate grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                  {candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      selected={selections[category.id] === candidate.id}
                      alreadyVoted={alreadyVotedCandidateId === candidate.id}
                      disabled={!isVotable}
                      onSelect={(candidateId) =>
                        toggleSelection(category.id, candidateId)
                      }
                    />
                  ))}
                </div>

                {candidates.length === 0 && (
                  <p className="py-4 text-center text-sm text-ink-soft">
                    No candidates in this category yet.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Submit error */}
      {submitState.kind === "error" && (
        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {submitState.message}
            {submitState.message.includes("already voted") && (
              <p className="mt-1 text-xs font-normal">
                The page has refreshed — categories you already voted in are now
                locked. You can still vote in the others.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sticky submit bar */}
      {votable.length > 0 && (
        <div className="sticky bottom-4 z-40 mt-10">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-primary-soft bg-surface/95 px-5 py-3.5 shadow-lg backdrop-blur">
            <div>
              <p className="text-sm font-semibold text-ink">
                {selectedCount} of {votable.length} selected
              </p>
              <p className="text-xs text-ink-soft">
                {selectedCount === votable.length
                  ? "Ready to submit your ballot!"
                  : "You can submit with fewer — or pick them all."}
              </p>
            </div>
            <button
              onClick={() => setReviewOpen(true)}
              disabled={selectedCount === 0}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-colors",
                selectedCount > 0
                  ? "bg-primary text-white shadow-sm hover:bg-primary-dark"
                  : "cursor-not-allowed bg-mist text-ink-soft"
              )}
            >
              <ClipboardCheck className="h-4 w-4" />
              Review &amp; Submit
            </button>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewOpen && (
        <ReviewModal
          items={Object.entries(selections)
            .map(([categoryId, candidateId]) => {
              const category = categories.find((c) => c.id === categoryId);
              const candidate = candidateById.get(candidateId);
              if (!category || !candidate) return null;
              return {
                categoryId,
                categoryName: category.name,
                categoryIcon: category.icon,
                candidateId,
                candidateName: candidate.name,
              } satisfies ReviewItem;
            })
            .filter((item): item is ReviewItem => item !== null)}
          submitting={submitState.kind === "submitting"}
          onChange={() => setReviewOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
