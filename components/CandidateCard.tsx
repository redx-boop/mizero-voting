"use client";

import Image from "next/image";
import { Check, Lock } from "lucide-react";
import type { Candidate } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";

// ============================================================================
// CandidateCard — one nominee inside a category on the vote page.
//
// States:
//   • selectable     → clicking selects / deselects the candidate
//   • selected       → gold ring + checkmark + "Selected" button
//   • alreadyVoted   → the student's previous vote, shown highlighted + locked
//   • disabled       → voting is closed in this category
// ============================================================================

export default function CandidateCard({
  candidate,
  selected,
  alreadyVoted,
  disabled,
  onSelect,
}: {
  candidate: Candidate;
  selected: boolean;
  alreadyVoted?: boolean;
  disabled?: boolean;
  onSelect?: (candidateId: string) => void;
}) {
  const locked = disabled || alreadyVoted;

  return (
    <button
      type="button"
      onClick={() => !locked && onSelect?.(candidate.id)}
      aria-pressed={selected}
      disabled={locked}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-surface text-left shadow-sm transition-all duration-300",
        selected
          ? "border-accent ring-2 ring-accent/40"
          : "border-primary-soft",
        locked
          ? "cursor-default opacity-80"
          : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
        !locked && !selected && "cursor-pointer"
      )}
    >
      {/* Selected checkmark badge */}
      {selected && (
        <span className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
      )}

      {/* Photo or initials placeholder */}
      <div className="relative h-44 w-full bg-gradient-to-br from-primary to-violet-700">
        {candidate.photo_url ? (
          <Image
            src={candidate.photo_url}
            alt={candidate.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-5xl font-bold text-white/90">
              {getInitials(candidate.name)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h4 className="text-base font-bold text-ink">{candidate.name}</h4>
        {candidate.class_name && (
          <p className="mt-0.5 text-sm text-ink-soft">{candidate.class_name}</p>
        )}
        {candidate.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink-soft">
            {candidate.description}
          </p>
        )}

        <div className="mt-auto pt-5">
          {alreadyVoted ? (
            <span className="flex items-center justify-center gap-1.5 rounded-full bg-success-soft px-4 py-2 text-sm font-semibold text-success">
              <Check className="h-4 w-4" strokeWidth={3} />
              Your vote
            </span>
          ) : selected ? (
            <span className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
              <Check className="h-4 w-4" strokeWidth={3} />
              Selected
            </span>
          ) : locked ? (
            <span className="flex items-center justify-center gap-1.5 rounded-full bg-mist px-4 py-2 text-sm font-medium text-ink-soft">
              <Lock className="h-4 w-4" />
              Voting closed
            </span>
          ) : (
            <span className="flex items-center justify-center rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              Vote
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
