import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Auth callback — Supabase redirects here after a user clicks an email
// confirmation link (or any OAuth flow). We exchange the ?code for a real
// session, then send the user to the page they were heading to.
// ============================================================================

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send them back to login with a hint.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
