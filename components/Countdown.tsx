"use client";

// ============================================================================
// Countdown — a live ticking timer shown on the homepage.
//
// Why a client component? The server renders the page once, but a countdown
// must update every second in the visitor's browser, so it uses a small
// setInterval that re-renders the remaining time locally.
// ============================================================================

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function Countdown({
  target,
  label = "Time remaining",
}: {
  target: string;
  label?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(new Date(target))
  );
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = getTimeLeft(new Date(target));
      setTimeLeft(left);
      if (left.days + left.hours + left.minutes + left.seconds === 0) {
        setExpired(true);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (expired) return null;

  const cells = [
    { value: timeLeft.days, label: "days" },
    { value: timeLeft.hours, label: "hrs" },
    { value: timeLeft.minutes, label: "min" },
    { value: timeLeft.seconds, label: "sec" },
  ];

  return (
    <div className="flex items-center gap-3">
      <CalendarClock className="h-5 w-5 shrink-0 text-accent" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/60">
          {label}
        </p>
        <div className="mt-1 flex gap-2">
          {cells.map((cell) => (
            <div
              key={cell.label}
              className="min-w-14 rounded-xl bg-white/10 px-3 py-2 text-center backdrop-blur"
            >
              <p className="text-xl font-bold tabular-nums text-white">
                {pad(cell.value)}
              </p>
              <p className="text-[10px] font-medium uppercase text-white/60">
                {cell.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
