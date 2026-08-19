"use client";

// ============================================================================
// LoginForm — email/password login using the Supabase browser client.
// The session is stored in a cookie by @supabase/ssr, so after a successful
// sign-in the navbar and protected pages immediately see the user.
// ============================================================================

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({
  next = "/vote",
}: {
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const message = error.message ?? "";
      if (/invalid login credentials/i.test(message)) {
        setError("Email or password is incorrect.");
      } else if (/not confirmed|verify your email|email not verified/i.test(message)) {
        setError("Please verify your email before logging in.");
      } else {
        setError(message);
      }
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-primary-soft bg-surface px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="you@school.edu"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-primary-soft bg-surface px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <LogIn className="h-5 w-5" />
        )}
        {loading ? "Signing in…" : "Login"}
      </button>

      <div className="flex items-center gap-3 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-soft to-surface p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
          <UserPlus className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">No account yet?</p>
          <p className="mt-0.5 text-xs text-ink-soft">Create one, then cast your vote.</p>
        </div>
        <Link
          href="/register"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Register
        </Link>
      </div>
    </form>
  );
}
