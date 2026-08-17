import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getElectionStatus } from "@/lib/status";
import { groupResults } from "@/lib/results";
import type { Candidate, Category, CategoryResult, Settings } from "@/lib/types";
import AdminDashboard, { type AdminStats } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Admin" };

// ============================================================================
// /admin — Server Component, PROTECTED.
//
// requireAdmin() reads the session cookie, looks the user's profile up in the
// database and redirects away unless the role is 'admin'. A student can never
// reach this page's data: the guard runs before anything is rendered.
// ============================================================================

export default async function AdminPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [
    { data: settings },
    { data: categories },
    { data: candidates },
    { data: results },
    { count: students },
    { count: votes },
    { count: activeCategories },
    { count: totalCandidates },
  ] = await Promise.all([
    supabase.from("settings").select("*").single(),
    supabase.from("categories").select("*").order("created_at"),
    supabase.from("candidates").select("*").order("created_at"),
    supabase.rpc("get_category_results"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("votes").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
  ]);

  const electionSettings = (settings as Settings | null) ?? {
    id: 1,
    election_name: "Mizero Awards",
    election_year: "2026",
    voting_start: null,
    voting_end: null,
    results_visibility: "after_close" as const,
    allow_registration: true,
    updated_at: "",
  };
  const status = getElectionStatus(electionSettings);

  const stats: AdminStats = {
    students: students ?? 0,
    votes: votes ?? 0,
    activeCategories: activeCategories ?? 0,
    candidates: totalCandidates ?? 0,
  };

  return (
    <AdminDashboard
      profile={profile}
      stats={stats}
      categories={(categories as Category[] | null) ?? []}
      candidates={(candidates as Candidate[] | null) ?? []}
      settings={electionSettings}
      status={status}
      results={groupResults((results as CategoryResult[] | null) ?? [])}
    />
  );
}
