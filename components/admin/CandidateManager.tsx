"use client";

// ============================================================================
// CandidateManager — add / edit / remove candidates, upload photos.
//
// Photo upload happens HERE in the browser (Supabase Storage via the client
// SDK, admin-only RLS policy). The resulting public URL is then sent to the
// createCandidate/updateCandidate server actions, which write it to the
// candidates table.
// ============================================================================

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Candidate, Category } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  createCandidate,
  deleteCandidate,
  updateCandidate,
} from "@/app/actions/admin";
import { Field, FormError, inputClass } from "@/components/admin/ui";

interface CandidateFormState {
  category_id: string;
  name: string;
  class_name: string;
  description: string;
  photo_url: string;
}

const EMPTY_FORM: CandidateFormState = {
  category_id: "",
  name: "",
  class_name: "",
  description: "",
  photo_url: "",
};

export default function CandidateManager({
  categories,
  candidates,
}: {
  categories: Category[];
  candidates: Candidate[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [form, setForm] = useState<CandidateFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const visibleCandidates =
    filterCategory === "all"
      ? candidates
      : candidates.filter((c) => c.category_id === filterCategory);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category_id: filterCategory !== "all" ? filterCategory : (categories[0]?.id ?? "") });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(candidate: Candidate) {
    setEditing(candidate);
    setForm({
      category_id: candidate.category_id,
      name: candidate.name,
      class_name: candidate.class_name ?? "",
      description: candidate.description ?? "",
      photo_url: candidate.photo_url ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function handlePhotoUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      // Unique path so uploads never overwrite each other.
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage
        .from("candidate-photos")
        .upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("candidate-photos").getPublicUrl(path);
      setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      category_id: form.category_id,
      name: form.name,
      class_name: form.class_name,
      description: form.description,
      photo_url: form.photo_url || null,
    };
    const result = editing
      ? await updateCandidate(editing.id, payload)
      : await createCandidate(payload);

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

  async function handleDelete(candidate: Candidate) {
    if (!confirm(`Remove "${candidate.name}"? Candidates with votes cannot be removed.`))
      return;
    setError(null);
    const result = await deleteCandidate(candidate.id);
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={cn(inputClass, "w-auto")}
          aria-label="Filter by category"
        >
          <option value="all">All categories ({candidates.length})</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon ?? "🏆"} {category.name}
            </option>
          ))}
        </select>
        <button
          onClick={openCreate}
          disabled={categories.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add candidate
        </button>
      </div>

      <FormError message={error} />

      {categories.length === 0 && (
        <p className="rounded-2xl bg-accent-soft px-4 py-6 text-center text-sm font-medium text-accent-dark">
          Create a category first — candidates need one to belong to.
        </p>
      )}

      {/* Create / edit form */}
      {formOpen && (
        <div className="animate-pop-in rounded-2xl border border-primary/30 bg-primary-soft/40 p-5">
          <h3 className="font-bold text-ink">
            {editing ? `Edit: ${editing.name}` : "New candidate"}
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Category *">
              <select
                className={inputClass}
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ?? "🏆"} {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Name *">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Aline Uwase"
                required
              />
            </Field>
            <Field label="Class / Team">
              <input
                className={inputClass}
                value={form.class_name}
                onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
                placeholder="Senior 6"
              />
            </Field>
            <Field label="Photo">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
                {form.photo_url && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, photo_url: "" }))}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                className={cn(inputClass, "min-h-20 resize-y")}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Why is this candidate nominated?"
              />
            </Field>
          </div>

          {/* Photo preview */}
          {form.photo_url && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-xl">
                <Image
                  src={form.photo_url}
                  alt="Preview"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <p className="truncate text-xs text-ink-soft">{form.photo_url}</p>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.category_id}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Add candidate"}
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

      {/* Candidate list */}
      <div className="overflow-hidden rounded-2xl border border-primary-soft bg-surface shadow-sm">
        {visibleCandidates.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            No candidates here yet.
          </p>
        ) : (
          <ul className="divide-y divide-primary-soft">
            {visibleCandidates.map((candidate) => {
              const category = categories.find((c) => c.id === candidate.category_id);
              return (
                <li key={candidate.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-primary-soft">
                    {candidate.photo_url ? (
                      <Image
                        src={candidate.photo_url}
                        alt={candidate.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                        {getInitials(candidate.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{candidate.name}</p>
                    <p className="text-xs text-ink-soft">
                      {category ? `${category.icon ?? "🏆"} ${category.name}` : "No category"}
                      {candidate.class_name && ` · ${candidate.class_name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(candidate)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-mist hover:text-ink"
                    aria-label={`Edit ${candidate.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(candidate)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                    aria-label={`Delete ${candidate.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
