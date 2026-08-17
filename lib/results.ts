// ============================================================================
// Groups the raw rows from get_category_results() per category and computes
// per-candidate totals, percentages and rankings for display.
// ============================================================================

import type { CategoryResult, CategoryResultWithMeta } from "@/lib/types";

export function groupResults(
  rows: CategoryResult[]
): Record<string, CategoryResultWithMeta[]> {
  const byCategory = new Map<string, CategoryResultWithMeta[]>();

  for (const row of rows) {
    const list = byCategory.get(row.category_id) ?? [];
    list.push({ ...row, total_votes: 0, percentage: 0, rank: 0 });
    byCategory.set(row.category_id, list);
  }

  for (const list of byCategory.values()) {
    // Sort candidates by votes, most first.
    list.sort((a, b) => b.vote_count - a.vote_count);

    const total = list.reduce((sum, r) => sum + r.vote_count, 0);

    list.forEach((r, index) => {
      r.rank = index + 1;
      r.total_votes = total;
      r.percentage = total > 0 ? (r.vote_count / total) * 100 : 0;
    });
  }

  return Object.fromEntries(byCategory);
}
