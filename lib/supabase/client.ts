"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client for the BROWSER (client components).
 *
 * It uses the public anon key, which is safe to ship to the browser.
 * Every query it makes is still restricted by Row Level Security —
 * hiding the key is not what protects the data; RLS is.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
