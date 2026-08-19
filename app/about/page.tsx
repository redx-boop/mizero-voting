import type { Metadata } from "next";
import { Heart, ListChecks, ShieldCheck, Sparkles, Vote } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import VoteNowButton from "@/components/VoteNowButton";

export const metadata: Metadata = { title: "About Mizero" };

export default async function AboutPage() {
  const supabase = await createClient();
  const [user, { data: categories }] = await Promise.all([
    getCurrentUser(),
    supabase.from("categories").select("id, name, icon").eq("is_active", true).order("created_at"),
  ]);
  const awards = (categories as Pick<Category, "id" | "name" | "icon">[] | null) ?? [];

  return (
    <div className="animate-fade-in">
      <section className="bg-primary py-14 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Sparkles className="h-7 w-7 text-accent" />
          </span>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">About Mizero</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Celebrating the people and moments that make our school special.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80 sm:text-lg">
            Mizero Voting is a school awards platform where students recognise outstanding students, performances, teams and teachers.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-14 sm:px-6 sm:py-16">
        <section className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Heart className="h-6 w-6" /></span>
          <div>
            <h2 className="text-2xl font-bold text-ink">Our purpose</h2>
            <p className="mt-3 max-w-3xl leading-7 text-ink-soft">
              We make it easy and organised for every student to take part in school awards, celebrate achievements, and support the people who make Mizero memorable.
            </p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-dark"><ListChecks className="h-6 w-6" /></span>
            <div><h2 className="text-2xl font-bold text-ink">How it works</h2><p className="mt-1 text-ink-soft">Five simple steps from account to ballot.</p></div>
          </div>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {["Create an account", "Log in", "Choose a category", "Choose your candidate", "Confirm your vote"].map((step, index) => (
              <li key={step} className="rounded-2xl border border-primary-soft bg-surface p-5 shadow-sm">
                <span className="text-sm font-bold text-primary">0{index + 1}</span>
                <p className="mt-2 font-semibold text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-primary-soft bg-surface p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-ink">Our awards</h2>
          <p className="mt-2 text-ink-soft">Discover the active categories in this year&apos;s Mizero Awards.</p>
          {awards.length === 0 ? (
            <p className="mt-5 text-sm text-ink-soft">Award categories will be announced soon.</p>
          ) : (
            <ul className="mt-5 flex flex-wrap gap-3">
              {awards.map((category) => (
                <li key={category.id} className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">
                  {category.icon ?? "🏆"} {category.name}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-6 rounded-3xl bg-accent-soft p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-accent-dark"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <h2 className="text-2xl font-bold text-ink">A fairer voting experience</h2>
            <p className="mt-3 max-w-3xl leading-7 text-ink-soft">The platform keeps voting organised, helping students take part clearly and fairly in each award category.</p>
          </div>
        </section>

        <section className="rounded-3xl bg-primary p-8 text-center text-white sm:p-10">
          <Vote className="mx-auto h-8 w-8 text-accent" />
          <h2 className="mt-3 text-2xl font-bold">Ready to vote?</h2>
          <p className="mt-2 text-white/75">Choose the people and teams you want to celebrate.</p>
          <div className="mt-6 flex justify-center">
            <VoteNowButton isAuthenticated={Boolean(user)} className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-accent-dark hover:shadow-xl" />
          </div>
        </section>
      </div>
    </div>
  );
}
