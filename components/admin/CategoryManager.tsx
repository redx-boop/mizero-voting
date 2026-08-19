"use client";

// ============================================================================
// CategoryManager — create / edit / activate / deactivate / delete categories.
// The "voting window" fields are optional per-category overrides; leaving
// them empty means the category follows the global election window.
// ============================================================================

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
  image_url: string;
  description: string;
  voting_start: string;
  voting_end: string;
}

const EMPTY_FORM: CategoryFormState = {
  name: "",
  icon: "🏆",
  image_url: "",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      image_url: category.image_url ?? "",
      description: category.description ?? "",
      voting_start: toLocalInputValue(category.voting_start),
      voting_end: toLocalInputValue(category.voting_end),
    });
    setError(null);
    setFormOpen(true);
  }

  async function removeStoredImage(imageUrl: string) {
    try {
      const path = new URL(imageUrl).pathname
        .split("/storage/v1/object/public/category-images/")[1];
      if (path) {
        await createClient().storage.from("category-images").remove([decodeURIComponent(path)]);
      }
    } catch {
      // The database update already succeeded. A stale storage object is harmless.
    }
  }

  async function handleImageUpload(file: File | null) {
    if (!file) return;
    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      setError("Use a JPEG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Category images must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("category-images")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("category-images").getPublicUrl(path);
      setForm((current) => ({ ...current, image_url: data.publicUrl }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Category image upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      icon: form.icon,
      image_url: form.image_url || null,
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
    if (editing?.image_url && editing.image_url !== form.image_url) {
      await removeStoredImage(editing.image_url);
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
            <Field label="Category image" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploading ? "Uploading…" : form.image_url ? "Change image" : "Upload image"}
                </button>
                {form.image_url && (
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, image_url: "" }))}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Remove image
                  </button>
                )}
                <p className="text-xs text-ink-soft">JPEG, PNG, or WEBP · up to 5 MB</p>
              </div>
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
          {form.image_url && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
              <div className="relative h-20 w-32 overflow-hidden rounded-xl bg-primary-soft">
                <Image src={form.image_url} alt="Category image preview" fill sizes="128px" className="object-cover" />
              </div>
              <p className="truncate text-xs text-ink-soft">Image ready to save with this category.</p>
            </div>
          )}
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
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft text-lg">
                  {category.image_url ? (
                    <Image src={category.image_url} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    category.icon ?? "🏆"
                  )}
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
