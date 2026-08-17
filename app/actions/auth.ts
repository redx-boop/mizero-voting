"use server";

// ============================================================================
// Server Action: create/complete a user's profile after sign-up.
//
// Server Actions run on the server with the user's session cookie. Even
// though the registration form already used the client SDK, this step is
// done here so validation happens on the server and the profile is written
// through RLS-protected queries.
//
// Normal students no longer provide a Student ID — student_id stays NULL in
// the profiles table (the column is kept for admins/legacy data, but it is
// never required during registration). The role is never set here: the
// database trigger and RLS keep it at 'student' unless an admin changes it.
// ============================================================================

import { createClient } from "@/lib/supabase/server";

export interface ProfileInput {
  full_name: string;
  class_name: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createProfile(
  userId: string,
  input: ProfileInput
): Promise<ActionResult> {
  const supabase = await createClient();

  // Only the logged-in user may create their own profile.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { ok: false, error: "You are not allowed to create this profile." };
  }

  // Registration can be switched off by the admin.
  const { data: settings } = await supabase
    .from("settings")
    .select("allow_registration")
    .single();
  if (settings && settings.allow_registration === false) {
    return { ok: false, error: "Student registration is currently closed." };
  }

  // Validate input server-side (never trust the browser).
  const full_name = input.full_name?.trim();
  const class_name = input.class_name?.trim() || null;

  if (!full_name || full_name.length < 2 || full_name.length > 80) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (class_name && class_name.length > 60) {
    return { ok: false, error: "Class name is too long." };
  }

  // Upsert: the sign-up trigger created the row from the sign-up metadata,
  // now finalize it. student_id intentionally stays NULL — students no
  // longer need to supply one. The protect_profile_identity trigger keeps
  // the role locked to whatever the database set.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name, class_name }, { onConflict: "id" });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
