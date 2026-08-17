"use client";

// ============================================================================
// RegisterForm — student registration.
//
// 1. Creates the Supabase Auth account (email + password). Full name and
//    class travel in user metadata, so the sign-up trigger can pre-fill the
//    profile row (student_id stays NULL — students no longer need one).
// 2. When a session exists immediately (email confirmation off), calls the
//    createProfile server action to finalize the profile (name + class).
// 3. When email confirmation is enabled, shows a "check your inbox" screen;
//    the confirmation link returns via /auth/callback. The profile row is
//    still created by the trigger from the sign-up metadata.
// ============================================================================

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createProfile } from "@/app/actions/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterForm({
  allowRegistration,
  next = "/vote",
}: {
  allowRegistration: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    class_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const full_name = form.full_name.trim();
    const email = form.email.trim();
    const class_name = form.class_name.trim();

    if (full_name.length < 2) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // 1) Create the auth account. School details travel in user metadata so
    //    the sign-up trigger can pre-fill the profile row. Students always
    //    register as regular students — the role is never set here.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          full_name,
          class_name,
        },
      },
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "This email is already registered. Try logging in instead."
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    // 2) Finalize the profile when we already have a session (email
    //    confirmation off). With confirmation on there is no session yet —
    //    the trigger created the row from the metadata, and the student
    //    verifies their email before their first login.
    if (data.session) {
      const result = await createProfile(data.session.user.id, {
        full_name,
        class_name,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not finish your registration.");
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
          <MailCheck className="h-7 w-7" />
        </span>
        <h2 className="text-xl font-bold text-ink">Check your inbox</h2>
        <p className="max-w-sm text-sm text-ink-soft">
          Account created successfully. Please check your email to verify your
          account before logging in.
        </p>
        <Link href="/login" className="mt-2 font-semibold text-primary hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (!allowRegistration) {
    return (
      <div className="rounded-xl bg-accent-soft px-4 py-6 text-center text-sm font-medium text-accent-dark">
        Registration is currently closed. Please contact a school administrator
        to create your account.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-ink">
          Full name
        </label>
        <input
          id="full_name"
          required
          value={form.full_name}
          onChange={update("full_name")}
          className="w-full rounded-xl border border-primary-soft bg-surface px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Chrispin Mugisha"
        />
      </div>

      <div>
        <label htmlFor="class_name" className="mb-1.5 block text-sm font-medium text-ink">
          Class / Team (optional)
        </label>
        <input
          id="class_name"
          value={form.class_name}
          onChange={update("class_name")}
          className="w-full rounded-xl border border-primary-soft bg-surface px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Senior 6"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          className="w-full rounded-xl border border-primary-soft bg-surface px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="student@example.com"
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
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          className="w-full rounded-xl border border-primary-soft bg-surface px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-ink">
          Confirm password
        </label>
        <input
          id="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={form.confirm_password}
          onChange={update("confirm_password")}
          className="w-full rounded-xl border border-primary-soft bg-surface px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Repeat your password"
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
          <UserPlus className="h-5 w-5" />
        )}
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
