"use client";

// ============================================================================
// VoterManager — the "Voters" admin tab.
//
// Flow: search for a student (name / student ID / class) → pick the right
// one → see their ballot (which candidates they voted for in which category)
// → reset a single vote or all of their votes. Resetting lets the student
// vote again in that category — the UNIQUE(user_id, category_id) constraint
// only blocks a second vote while the first one exists.
//
// All data changes go through the admin server actions in app/actions/admin.ts,
// which verify the caller is a real admin before touching the database.
// ============================================================================

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  getStudentVotes,
  resetAllStudentVotes,
  resetVote,
  searchStudents,
  type StudentSearchResult,
  type StudentVote,
} from "@/app/actions/admin";
import { inputClass } from "@/components/admin/ui";

export default function VoterManager() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [students, setStudents] = useState<StudentSearchResult[] | null>(null);
  const [searched, setSearched] = useState(false);

  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [votes, setVotes] = useState<StudentVote[] | null>(null);
  const [loadingVotes, setLoadingVotes] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSelected(null);
    setVotes(null);
    setSearched(true);
    setSearching(true);

    const result = await searchStudents(query);
    setSearching(false);
    if (!result.ok) {
      setError(result.error ?? "Search failed.");
      setStudents(null);
      return;
    }
    setStudents(result.students ?? []);
  }

  async function handleSelect(student: StudentSearchResult) {
    setSelected(student);
    setVotes(null);
    setError(null);
    setMessage(null);
    setLoadingVotes(true);

    const result = await getStudentVotes(student.id);
    setLoadingVotes(false);
    if (!result.ok) {
      setError(result.error ?? "Could not load this student's votes.");
      return;
    }
    setVotes(result.votes ?? []);
  }

  async function handleResetVote(vote: StudentVote) {
    if (
      !confirm(
        `Reset this vote?\n\n${vote.category_name} → ${vote.candidate_name}\n\nThe student will be able to vote again in this category.`
      )
    )
      return;

    setWorking(true);
    setError(null);
    setMessage(null);
    const result = await resetVote(vote.id);
    setWorking(false);

    if (!result.ok) {
      setError(result.error ?? "Could not reset the vote.");
      return;
    }

    setMessage(`Vote in "${vote.category_name}" reset — the student can vote again there.`);
    if (selected) await handleSelect(selected); // reload the ballot
    router.refresh();
  }

  async function handleResetAll() {
    if (!selected) return;
    if (
      !confirm(
        `Reset ALL of ${selected.full_name}'s votes? They will be able to vote again in every category.`
      )
    )
      return;

    setWorking(true);
    setError(null);
    setMessage(null);
    const result = await resetAllStudentVotes(selected.id);
    setWorking(false);

    if (!result.ok) {
      setError(result.error ?? "Could not reset the votes.");
      return;
    }

    setMessage(`All of ${selected.full_name}'s votes were reset.`);
    setVotes([]);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-ink-soft">
          Find a student, review their ballot and reset a vote if needed.
          Resetting lets the student vote again in that category.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, student ID or class…"
            className={inputClass}
            aria-label="Search students"
          />
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </form>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {message}
        </p>
      )}

      {/* Search results */}
      {searched && !searching && students !== null && (
        <div className="overflow-hidden rounded-2xl border border-primary-soft bg-surface shadow-sm">
          {students.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-soft">
              No students found matching “{query.trim()}”.
            </p>
          ) : (
            <ul className="divide-y divide-primary-soft">
              {students.map((student) => (
                <li key={student.id}>
                  <button
                    onClick={() => handleSelect(student)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-soft/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {student.full_name}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {student.student_id ?? "No student ID"}
                        {student.class_name && ` · ${student.class_name}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      View ballot →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {students.length === 10 && (
            <p className="border-t border-primary-soft px-4 py-2 text-xs text-ink-soft">
              Showing the first 10 matches — refine your search for more.
            </p>
          )}
        </div>
      )}

      {/* Selected student's ballot */}
      {selected && (
        <div className="rounded-2xl border border-primary-soft bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-ink">{selected.full_name}</h3>
              <p className="text-xs text-ink-soft">
                {selected.student_id ?? "No student ID"}
                {selected.class_name && ` · ${selected.class_name}`}
              </p>
            </div>
            <button
              onClick={handleResetAll}
              disabled={working || (votes?.length ?? 0) === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 px-3.5 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Reset all votes
            </button>
          </div>

          {loadingVotes ? (
            <div className="mt-5 flex items-center justify-center gap-2 py-6 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading ballot…
            </div>
          ) : votes !== null && votes.length === 0 ? (
            <p className="mt-5 rounded-xl bg-mist px-4 py-6 text-center text-sm text-ink-soft">
              This student hasn&apos;t voted yet.
            </p>
          ) : (
            <ul className="mt-5 space-y-2">
              {(votes ?? []).map((vote) => (
                <li
                  key={vote.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-soft bg-mist/50 px-4 py-3"
                >
                  <span className="text-xl">{vote.category_icon ?? "🏆"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                      {vote.category_name}
                    </p>
                    <p className="truncate font-semibold text-ink">
                      {vote.candidate_name}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-ink-soft">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {new Date(vote.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleResetVote(vote)}
                    disabled={working}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
