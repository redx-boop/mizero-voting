import type { ElectionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<ElectionStatus, string> = {
  not_started: "bg-accent-soft text-accent-dark ring-accent/20",
  active: "bg-success-soft text-success ring-success/20",
  closed: "bg-mist text-ink-soft ring-ink/10",
};

const LABELS: Record<ElectionStatus, string> = {
  not_started: "Not started",
  active: "Voting open",
  closed: "Voting ended",
};

/** Small pill that shows whether voting is open, upcoming or over. */
export default function StatusBadge({
  status,
  className,
}: {
  status: ElectionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1",
        STYLES[status],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "active"
            ? "bg-success"
            : status === "not_started"
              ? "bg-accent"
              : "bg-ink-soft/50"
        )}
      />
      {LABELS[status]}
    </span>
  );
}
