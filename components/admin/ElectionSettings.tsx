"use client";

// ============================================================================
// ElectionSettings — configure the global election window, results
// visibility and whether student registration is allowed.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Eye, EyeOff, Save } from "lucide-react";
import type { ElectionStatus, ResultsVisibility, Settings } from "@/lib/types";
import { getStatusLabel } from "@/lib/status";
import StatusBadge from "@/components/StatusBadge";
import { updateSettings } from "@/app/actions/admin";
import {
  Field,
  FormError,
  fromLocalInputValue,
  inputClass,
  toLocalInputValue,
} from "@/components/admin/ui";

export default function ElectionSettings({
  settings,
  status,
}: {
  settings: Settings;
  status: ElectionStatus;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    election_name: settings.election_name,
    election_year: settings.election_year,
    voting_start: toLocalInputValue(settings.voting_start),
    voting_end: toLocalInputValue(settings.voting_end),
    results_visibility: settings.results_visibility as ResultsVisibility,
    allow_registration: settings.allow_registration,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateSettings({
      election_name: form.election_name,
      election_year: form.election_year,
      voting_start: fromLocalInputValue(form.voting_start),
      voting_end: fromLocalInputValue(form.voting_end),
      results_visibility: form.results_visibility,
      allow_registration: form.allow_registration,
    });

    if (!result.ok) {
      setError(result.error ?? "Could not save settings.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-soft bg-surface p-5 shadow-sm">
        <div>
          <p className="font-bold text-ink">Current election status</p>
          <p className="mt-0.5 text-sm text-ink-soft">{getStatusLabel(status)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="rounded-2xl border border-primary-soft bg-surface p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <CalendarClock className="h-5 w-5 text-primary" />
          Election details
        </h2>

        <FormError message={error} />
        {saved && (
          <p className="rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
            Settings saved.
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Election name">
            <input
              className={inputClass}
              value={form.election_name}
              onChange={(e) => setForm((f) => ({ ...f, election_name: e.target.value }))}
            />
          </Field>
          <Field label="Year">
            <input
              className={inputClass}
              value={form.election_year}
              onChange={(e) => setForm((f) => ({ ...f, election_year: e.target.value }))}
            />
          </Field>
          <Field label="Voting starts">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.voting_start}
              onChange={(e) => setForm((f) => ({ ...f, voting_start: e.target.value }))}
            />
          </Field>
          <Field label="Voting ends">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.voting_end}
              onChange={(e) => setForm((f) => ({ ...f, voting_end: e.target.value }))}
            />
          </Field>
          <Field label="Results visibility for students">
            <select
              className={inputClass}
              value={form.results_visibility}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  results_visibility: e.target.value as ResultsVisibility,
                }))
              }
            >
              <option value="after_close">Visible only after voting closes</option>
              <option value="visible">Visible at all times</option>
              <option value="hidden">Hidden (admin only)</option>
            </select>
          </Field>
          <Field label="Student registration">
            <select
              className={inputClass}
              value={form.allow_registration ? "open" : "closed"}
              onChange={(e) =>
                setForm((f) => ({ ...f, allow_registration: e.target.value === "open" }))
              }
            >
              <option value="open">Open — students can register</option>
              <option value="closed">Closed — admin creates accounts</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save settings"}
          </button>

          <span className="flex items-center gap-2 text-xs text-ink-soft">
            {form.results_visibility === "visible" ? (
              <Eye className="h-3.5 w-3.5 text-success" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-accent-dark" />
            )}
            {form.results_visibility === "visible"
              ? "Results are public"
              : form.results_visibility === "hidden"
                ? "Results hidden from students"
                : "Results revealed when voting closes"}
          </span>
        </div>
      </div>
    </div>
  );
}
