"use client";

// ============================================================================
// WinnersReveal — the celebration screen shown on /winners.
//
// • A rain of confetti (pure CSS animation — see the confetti-fall keyframes
//   in app/globals.css). The pieces are generated deterministically (no
//   Math.random) so the server and browser render identical markup, which
//   avoids React hydration mismatches.
// • Each category's winner card pops in with a small staggered delay, so the
//   results feel like they are being announced one by one.
// ============================================================================

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Crown, Medal, PartyPopper } from "lucide-react";
import type { CategoryResultWithMeta } from "@/lib/types";
import { getInitials } from "@/lib/utils";

export interface WinnerCategory {
  categoryId: string;
  categoryName: string;
  winner: CategoryResultWithMeta;
  /** 2nd and 3rd place, shown under the winner. */
  runnersUp: CategoryResultWithMeta[];
}

const CONFETTI_COLORS = ["#4f46e5", "#7c3aed", "#f59e0b", "#fbbf24", "#10b981", "#ec4899"];

const CONFETTI = Array.from({ length: 36 }, (_, i) => {
  const round = i % 4 === 0;
  return {
    left: (i * 37 + 11) % 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    // Negative delay = the piece starts mid-fall, so confetti is already
    // raining the moment the page appears.
    animationDelay: `${-((i * 0.35) % 6)}s`,
    animationDuration: `${3.5 + (i % 5) * 0.6}s`,
    width: round ? 10 : 8,
    height: round ? 10 : 14,
    borderRadius: round ? "9999px" : "2px",
  };
});

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export default function WinnersReveal({
  electionName,
  electionYear,
  categories,
  totalVotes,
}: {
  electionName: string;
  electionYear: string;
  categories: WinnerCategory[];
  totalVotes: number;
}) {
  return (
    <div className="relative">
      {/* Confetti layer — fixed to the viewport, ignores clicks. */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className="absolute top-[-10vh]"
            style={{
              left: `${piece.left}%`,
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              borderRadius: piece.borderRadius,
              animation: `confetti-fall ${piece.animationDuration} linear infinite`,
              animationDelay: piece.animationDelay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-white shadow-lg shadow-accent/30">
            <PartyPopper className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            And the winners are…
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {electionName} {electionYear} · {totalVotes} votes counted
          </p>
        </header>

        <div className="mt-10 space-y-8">
          {categories.map((category, index) => (
            <WinnerCard key={category.categoryId} category={category} index={index} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/results"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            See all results
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function WinnerCard({ category, index }: { category: WinnerCategory; index: number }) {
  const { winner, runnersUp } = category;

  return (
    <section
      className="animate-pop-in rounded-3xl border-2 border-accent/60 bg-surface p-6 shadow-lg shadow-accent/10 sm:p-8"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{category.categoryName}</h2>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-dark">
          {winner.total_votes} votes in this category
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row">
        {/* Photo with a gold ring */}
        <div className="shrink-0">
          <div className="rounded-full bg-gradient-to-br from-accent to-amber-400 p-1">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-primary to-violet-700">
              {winner.photo_url ? (
                <Image
                  src={winner.photo_url}
                  alt={winner.candidate_name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                  {getInitials(winner.candidate_name)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-sm">
            <Crown className="h-3.5 w-3.5" />
            Winner
          </span>
          <h3 className="mt-2 text-2xl font-extrabold text-ink">
            {winner.candidate_name}
          </h3>
          {winner.candidate_class && (
            <p className="text-sm text-ink-soft">{winner.candidate_class}</p>
          )}
          <p className="mt-1 text-sm font-semibold text-primary">
            {winner.vote_count} votes · {formatPercent(winner.percentage)}
          </p>
        </div>
      </div>

      {runnersUp.length > 0 && (
        <div className="mt-6 border-t border-primary-soft pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Runners-up
          </p>
          <ul className="mt-2 space-y-2">
            {runnersUp.map((runner) => (
              <li key={runner.candidate_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <Medal className="h-4 w-4 shrink-0 text-ink-soft" />
                  <span className="truncate">{runner.candidate_name}</span>
                  {runner.candidate_class && (
                    <span className="shrink-0 text-xs text-ink-soft">
                      · {runner.candidate_class}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-ink-soft">
                  {runner.vote_count} votes
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
