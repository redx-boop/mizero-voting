// ============================================================================
// Authentication & authorization helpers used by Server Components and
// Server Actions. These run ON THE SERVER, so they can safely decide who
// may access a page. Never trust a role sent by the client — always look
// the profile up from the database using the session cookie.
// ============================================================================

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Returns the logged-in Supabase Auth user, or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the user's profiles row, or null. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return (data as Profile) ?? null;
}

/**
 * Page guard: redirects to /login when there is no session.
 * Returns the user object for pages that need it.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Admin guard for pages: redirects to /login when logged out and to /
 * when the user is not an admin. Used by /admin (server component).
 */
export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") redirect("/");

  return { user, profile };
}

/**
 * Admin guard for Server Actions: actions cannot redirect to show an error,
 * so this returns the admin profile or null. Each admin action checks it
 * first and aborts with an error message when null.
 */
export async function getAdminProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") return null;
  return profile;
}
