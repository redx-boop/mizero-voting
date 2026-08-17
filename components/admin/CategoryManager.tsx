"use client";

// ============================================================================
// CategoryManager — create / edit / activate / deactivate / delete categories.
// The "voting window" fields are optional per-category overrides; leaving
// them empty means the category follows the global election window.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  createCategory,
  deleteCategory,
  setCategoryActive,
  updateCategory,
} from "@/app/actions/admin";
import {
  Field,
  FormError,
  fromLocalInputValue,
  inputClass,
  toLocalInputValue,
} from "@/components/admin/ui";

interface CategoryFormState {
  name: string;
  icon: string;
  description: string;
  voting_start: string;
  voting_end: string;
}

const EMPTY_FORM: CategoryFormState = {
  name: "",
  icon: "🏆",
  description: "",
  voting_start: "",
  voting_end: "",
};

export default function CategoryManager({
  categories,
  candidateCounts,
}: {
  categories: Category[];
  candidateCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      icon: category.icon ?? "🏆",
      description: category.description ?? "",
      voting_start: toLocalInputValue(category.voting_start),
      voting_end: toLocalInputValue(category.voting_end),
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      icon: form.icon,
      description: form.description,
      voting_start: fromLocalInputValue(form.voting_start),
      voting_end: fromLocalInputValue(form.voting_end),
    };
    const result = editing
      ? await updateCategory(editing.id, payload)
      : await createCategory(payload);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }
    setFormOpen(false);
    setEditing(null);
    setSaving(false);
    router.refresh();
  }

  async function handleToggleActive(category: Category) {
    setError(null);
    const result = await setCategoryActive(category.id, !category.is_active);
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    router.refresh();
  }

  async function handleDelete(category: Category) {
    if (
      !confirm(
        `Delete "${category.name}"? This cannot be undone. Categories that already have votes can only be deactivated.`
      )
    )
      return;
    setError(null);
    const result = await deleteCategory(category.id);
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"} total
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> Add category
        </button>
      </div>

      <FormError message={error} />

      {/* Create / edit form */}
      {formOpen && (
        <div className="animate-pop-in rounded-2xl border border-primary/30 bg-primary-soft/40 p-5">
          <h3 className="font-bold text-ink">
            {editing ? `Edit: ${editing.name}` : "New category"}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name *">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Miss Mizero"
                required
              />
            </Field>
            <Field label="Icon (emoji)">
              <input
                className={inputClass}
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="👑"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                className={cn(inputClass, "min-h-20 resize-y")}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What is this award about?"
              />
            </Field>
            <Field label="Voting starts (optional override)">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.voting_start}
                onChange={(e) => setForm((f) => ({ ...f, voting_start: e.target.value }))}
              />
            </Field>
            <Field label="Voting ends (optional override)">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.voting_end}
                onChange={(e) => setForm((f) => ({ ...f, voting_end: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Create category"}
            </button>
            <button
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
              className="rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="overflow-hidden rounded-2xl border border-primary-soft bg-surface shadow-sm">
        {categories.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            No categories yet — click “Add category” to create the first one.
          </p>
        ) : (
          <ul className="divide-y divide-primary-soft">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-lg">
                  {category.icon ?? "🏆"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{category.name}</p>
                  <p className="text-xs text-ink-soft">
                    {candidateCounts[category.id] ?? 0} candidates
                    {category.voting_start &&
                      ` · opens ${new Date(category.voting_start).toLocaleString()}`}
                    {category.voting_end &&
                      ` · closes ${new Date(category.voting_end).toLocaleString()}`}
                  </p>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(category)}
                  aria-label={category.is_active ? "Deactivate" : "Activate"}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    category.is_active ? "bg-success" : "bg-mist ring-1 ring-primary-soft"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      category.is_active ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </button>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    category.is_active ? "text-success" : "text-ink-soft"
                  )}
                >
                  {category.is_active ? "Active" : "Off"}
                </span>

                <button
                  onClick={() => openEdit(category)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-mist hover:text-ink"
                  aria-label={`Edit ${category.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
