import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";

/** Homepage card for one voting category. */
export default function CategoryCard({
  category,
  candidateCount,
}: {
  category: Category;
  candidateCount: number;
}) {
  return (
    <Link
      href="/vote"
      className="group flex flex-col rounded-2xl border border-primary-soft bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-2xl">
          {category.icon ?? "🏆"}
        </span>
        <ArrowRight className="h-5 w-5 text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{category.name}</h3>
      {category.description && (
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
          {category.description}
        </p>
      )}
      <p className="mt-3 text-xs font-medium text-primary">
        {candidateCount} candidate{candidateCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
