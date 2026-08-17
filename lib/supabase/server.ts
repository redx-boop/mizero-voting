import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client for the SERVER (server components, server actions, routes).
 *
 * The user's session is stored in an encrypted cookie. This client reads that
 * cookie so `supabase.auth.getUser()` knows who is making the request.
 *
 * `setAll` is a no-op inside Server Components (you cannot set cookies during
 * render) — that's fine, because middleware.ts refreshes the session cookie
 * on every navigation.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore, middleware handles it.
          }
        },
      },
    }
  );
}
