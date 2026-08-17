import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RegisterForm from "@/components/RegisterForm";
import type { Settings } from "@/lib/types";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/vote");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .single();
  const allowRegistration = (settings as Settings | null)?.allow_registration ?? true;

  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-md">
          <UserPlus className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Register once with your name and class, then vote in every category.
        </p>
      </div>

      <div className="rounded-2xl border border-primary-soft bg-surface p-6 shadow-sm">
        <RegisterForm allowRegistration={allowRegistration} next={next ?? "/vote"} />
      </div>
    </div>
  );
}
