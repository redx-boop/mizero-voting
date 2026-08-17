// ============================================================================
// Small building blocks shared by the admin dashboard tabs:
// styled form fields + helpers to convert ISO timestamps to <input
// type="datetime-local"> values and back.
// ============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-primary-soft bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

/** ISO string → value for <input type="datetime-local"> (local time). */
export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO string, or null when empty. */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
