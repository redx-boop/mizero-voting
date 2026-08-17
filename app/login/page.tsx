import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  // Already logged in? No need to see the login page.
  const user = await getCurrentUser();
  if (user) redirect("/vote");

  const { next, error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
          <Trophy className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Login to cast your vote in the Mizero Awards.
        </p>
      </div>

      <div className="rounded-2xl border border-primary-soft bg-surface p-6 shadow-sm">
        {error === "auth" && (
          <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            The sign-in link was invalid or has expired. Please log in again.
          </p>
        )}
        <LoginForm next={next ?? "/vote"} />
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Having trouble logging in?{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          Contact your school admin
        </Link>
      </p>
    </div>
  );
}
