// ============================================================================
// Election status logic.
//
// There are two layers of timing:
//   1. The GLOBAL election window on the settings row (voting_start / end).
//   2. OPTIONAL per-category windows on each category row.
//
// The global window decides whether the election is not_started / active /
// closed. A category is only votable when the global election is active AND
// the category is active AND (if it has its own window) inside that window.
// ============================================================================

import type { Category, ElectionStatus, Settings } from "@/lib/types";

/** Global election status derived from the settings row. */
export function getElectionStatus(
  settings: Settings,
  now: Date = new Date()
): ElectionStatus {
  const start = settings.voting_start ? new Date(settings.voting_start) : null;
  const end = settings.voting_end ? new Date(settings.voting_end) : null;

  if (end && now > end) return "closed";
  if (start && now < start) return "not_started";
  return "active";
}

/**
 * Status of ONE category: its own window (if any) takes priority, otherwise
 * it follows the global election status. Inactive categories count as closed.
 */
export function getCategoryStatus(
  category: Category,
  globalStatus: ElectionStatus,
  now: Date = new Date()
): ElectionStatus {
  if (!category.is_active) return "closed";

  const start = category.voting_start ? new Date(category.voting_start) : null;
  const end = category.voting_end ? new Date(category.voting_end) : null;

  if (end && now > end) return "closed";
  if (start && now < start) return "not_started";
  return globalStatus;
}

/** Can a student currently vote in this category? */
export function isCategoryVotable(
  category: Category,
  globalStatus: ElectionStatus,
  now: Date = new Date()
): boolean {
  return getCategoryStatus(category, globalStatus, now) === "active";
}

/**
 * Can students (non-admins) see the results?
 * - hidden     → never
 * - visible    → always
 * - after_close→ only once voting has ended
 * (Admins can always see results — enforced in the database function too.)
 */
export function canSeeResults(
  settings: Settings,
  status: ElectionStatus
): boolean {
  if (settings.results_visibility === "visible") return true;
  if (settings.results_visibility === "hidden") return false;
  return status === "closed"; // "after_close"
}

export function getStatusLabel(status: ElectionStatus): string {
  switch (status) {
    case "not_started":
      return "Voting has not started yet";
    case "active":
      return "Voting is currently open";
    case "closed":
      return "Voting has ended";
  }
}
