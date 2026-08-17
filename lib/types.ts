// ============================================================================
// TypeScript types that mirror the Supabase tables (see supabase/schema.sql).
// Keeping them here means the whole app shares one source of truth for shapes.
// ============================================================================

export type Role = "student" | "admin";

export interface Profile {
  id: string;
  student_id: string | null;
  full_name: string;
  class_name: string | null;
  role: Role;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  voting_start: string | null;
  voting_end: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  class_name: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Vote {
  id: string;
  category_id: string;
  candidate_id: string;
  user_id: string;
  created_at: string;
}

export type ResultsVisibility = "hidden" | "visible" | "after_close";

export interface Settings {
  id: number;
  election_name: string;
  election_year: string;
  voting_start: string | null;
  voting_end: string | null;
  results_visibility: ResultsVisibility;
  allow_registration: boolean;
  updated_at: string;
}

/** Global election state, derived from the settings voting window. */
export type ElectionStatus = "not_started" | "active" | "closed";

/** One row returned by the get_category_results() database function. */
export interface CategoryResult {
  category_id: string;
  category_name: string;
  candidate_id: string;
  candidate_name: string;
  candidate_class: string | null;
  photo_url: string | null;
  vote_count: number;
}

/** A result row enriched on the server with total, percentage and rank. */
export interface CategoryResultWithMeta extends CategoryResult {
  total_votes: number;
  percentage: number;
  rank: number;
}
