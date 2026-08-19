import { Medal, Star, Trophy } from "lucide-react";
import type { CategoryResultWithMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-sm">
        <Trophy className="h-4 w-4" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Medal className="h-4 w-4" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-ink-soft">
        <Star className="h-4 w-4" />
      </span>
    );
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-sm font-semibold text-ink-soft">
      {rank}
    </span>
  );
}

/**
 * ResultsChart — renders one category's candidates with votes, percentage
 * and a progress bar. Pure presentational, used by /results and /admin.
 */
export default function ResultsChart({
  categoryName,
  results,
}: {
  categoryName: string;
  results: CategoryResultWithMeta[];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-primary-soft bg-surface shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-primary via-violet-500 to-accent" />
      <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{categoryName}</h2>
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {results[0]?.total_votes ?? 0} total votes
        </span>
      </div>

      <div className="mt-6 space-y-6">
        {results.map((result) => (
          <div key={result.candidate_id}>
            <div className="flex items-center gap-3">
              <RankBadge rank={result.rank} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="truncate font-semibold text-ink">
                    {result.candidate_name}
                  </p>
                  <p className="text-sm tabular-nums text-ink-soft">
                    <span className="font-bold text-ink">
                      {result.vote_count}
                    </span>{" "}
                    votes · {formatPercent(result.percentage)}
                  </p>
                </div>
                {result.candidate_class && (
                  <p className="text-xs text-ink-soft">
                    {result.candidate_class}
                  </p>
                )}
              </div>
            </div>
            {/* Progress bar width = percentage of votes in this category */}
            <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-mist ring-1 ring-primary/5">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  result.rank === 1
                    ? "bg-gradient-to-r from-accent to-amber-400"
                    : "bg-gradient-to-r from-primary to-violet-500"
                )}
                style={{
                  width: `${Math.max(result.percentage, result.vote_count > 0 ? 2 : 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
