import { Loader2 } from "lucide-react";

// Shown automatically while a route's server data is loading.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-soft">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}
