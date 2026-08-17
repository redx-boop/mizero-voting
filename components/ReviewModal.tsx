"use client";

// ============================================================================
// ReviewModal — the "Please review your selections before submitting" step.
// Lists every chosen candidate, lets the student go back to change a choice,
// or submit the ballot.
// ============================================================================

import { CheckCircle2, Loader2, PencilLine, Send } from "lucide-react";

export interface ReviewItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  candidateId: string;
  candidateName: string;
}

export default function ReviewModal({
  items,
  submitting,
  onChange,
  onSubmit,
}: {
  items: ReviewItem[];
  submitting: boolean;
  onChange: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Review your votes"
      onClick={onChange}
    >
      <div
        className="animate-pop-in w-full max-w-lg rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="mt-3 text-xl font-bold text-ink">
            Please review your selections before submitting
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            You can still change your mind — once submitted, your vote is final.
          </p>
        </div>

        <ul className="mt-6 divide-y divide-primary-soft rounded-2xl border border-primary-soft">
          {items.map((item) => (
            <li key={item.categoryId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xl">{item.categoryIcon ?? "🏆"}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                    {item.categoryName}
                  </p>
                  <p className="truncate font-semibold text-ink">
                    {item.candidateName}
                  </p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onChange}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-60"
          >
            <PencilLine className="h-4 w-4" />
            Change selection
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Submitting…" : "Submit Votes"}
          </button>
        </div>
      </div>
    </div>
  );
}
