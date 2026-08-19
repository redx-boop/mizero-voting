import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  ListChecks,
  PartyPopper,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getElectionStatus } from "@/lib/status";
import type { Candidate, Category, Settings } from "@/lib/types";
import CategoryCard from "@/components/CategoryCard";
import Countdown from "@/components/Countdown";
import StatusBadge from "@/components/StatusBadge";
import VoteNowButton from "@/components/VoteNowButton";

export const metadata = {
  title: "Mizero Awards 2026 — School Voting",
};

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: settings }, { data: categories }, { data: candidates }] =
    await Promise.all([
      supabase.from("settings").select("*").single(),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase.from("candidates").select("id, category_id, is_active"),
    ]);

  const electionSettings = settings as Settings | null;
  const activeCategories = (categories as Category[] | null) ?? [];
  const status = getElectionStatus(
    electionSettings ?? {
      id: 1,
      election_name: "Mizero Awards",
      election_year: "2026",
      voting_start: null,
      voting_end: null,
      results_visibility: "after_close",
      allow_registration: true,
      updated_at: "",
    }
  );

  // Candidate count per category (only counting active candidates).
  const countByCategory = new Map<string, number>();
  for (const candidate of (candidates as Pick<Candidate, "category_id" | "is_active">[] | null) ?? []) {
    if (candidate.is_active) {
      countByCategory.set(
        candidate.category_id,
        (countByCategory.get(candidate.category_id) ?? 0) + 1
      );
    }
  }

  const electionName = electionSettings?.election_name ?? "Mizero Awards";
  const electionYear = electionSettings?.election_year ?? "2026";

  // Which countdown should the hero show?
  const countdownTarget =
    status === "not_started" && electionSettings?.voting_start
      ? electionSettings.voting_start
      : status === "active" && electionSettings?.voting_end
        ? electionSettings.voting_end
        : null;

  return (
    <div className="animate-fade-in">
      {/* ================= HERO ================= */}
      <section className="bg-gradient-to-br from-primary via-primary-dark to-violet-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 shadow-lg ring-1 ring-white/20 backdrop-blur">
                <Trophy className="h-10 w-10 text-accent" />
              </span>

              <div className="space-y-3">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                  {electionName}{" "}
                  <span className="text-accent">{electionYear}</span>
                </h1>
                <p className="mx-auto max-w-2xl text-base text-white/80 sm:text-lg">
                  The night we celebrate the best of our school. Vote for your
                  favourites across every category — one student, one vote.
                </p>
              </div>

              <StatusBadge status={status} />

              {countdownTarget && (
                <Countdown
                  target={countdownTarget}
                  label={
                    status === "not_started"
                      ? "Voting opens in"
                      : "Voting closes in"
                  }
                />
              )}

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <VoteNowButton
                  isAuthenticated={Boolean(user)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-accent-dark hover:shadow-xl"
                />
                <Link
                  href="/results"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-7 py-3.5 font-semibold text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/20"
                >
                  View Results
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <Image
                src="/hero.jpg"
                alt={`${electionName} ${electionYear} — celebrate the best of our school`}
                width={1376}
                height={768}
                priority
                className="aspect-[16/9] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/25"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: BadgeCheck,
              title: "1 · Create your account",
              text: "Register once with your details — it takes under a minute.",
            },
            {
              icon: ListChecks,
              title: "2 · Pick your favourites",
              text: "Choose one candidate in each category. You can change your mind before submitting.",
            },
            {
              icon: PartyPopper,
              title: "3 · Celebrate the winners",
              text: "Results are counted live from every student's ballot.",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="group rounded-3xl border border-primary-soft bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-105"><step.icon className="h-6 w-6" /></span>
              <h3 className="mt-4 font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink">Voting categories</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Explore the awards and cast your vote for the night of nights.
            </p>
          </div>
          <VoteNowButton
            isAuthenticated={Boolean(user)}
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          />
        </div>

        {activeCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary-soft bg-surface p-10 text-center">
            <p className="text-4xl">🏆</p>
            <p className="mt-3 font-semibold text-ink">No categories yet</p>
            <p className="mt-1 text-sm text-ink-soft">
              The administrator hasn&apos;t added any voting categories yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                candidateCount={countByCategory.get(category.id) ?? 0}
                isAuthenticated={Boolean(user)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
