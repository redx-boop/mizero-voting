"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { LogIn, UserPlus, Vote, X } from "lucide-react";

export default function VoteNowButton({ isAuthenticated, className, destination = "/vote", children }: { isAuthenticated: boolean; className?: string; destination?: string; children?: ReactNode }) {
  const [choiceOpen, setChoiceOpen] = useState(false);
  const buttonTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerContent = children ?? <><Vote className="h-5 w-5" />VOTE NOW</>;
  const next = encodeURIComponent(destination);

  useEffect(() => {
    if (!choiceOpen) return;
    const trigger = buttonTriggerRef.current;
    closeButtonRef.current?.focus();
    return () => {
      trigger?.focus();
    };
  }, [choiceOpen]);

  function closeDialog() { setChoiceOpen(false); }
  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { closeDialog(); return; }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  if (isAuthenticated) return <Link href={destination} className={className}>{triggerContent}</Link>;

  return <>
    <button ref={buttonTriggerRef} type="button" onClick={() => setChoiceOpen(true)} className={className}>{triggerContent}</button>
    {choiceOpen && <div className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="vote-choice-title" aria-describedby="vote-choice-description" onKeyDown={handleDialogKeyDown} className="animate-pop-in fixed left-1/2 top-1/2 w-[min(92vw,52rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-scroll rounded-3xl bg-surface p-5 shadow-2xl [scrollbar-gutter:stable] sm:p-8">
        <header className="flex items-start justify-between gap-6">
          <div className="min-w-0"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Mizero Awards</p><h2 id="vote-choice-title" className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Witeguye gutora?</h2><p id="vote-choice-description" className="mt-2 text-sm leading-6 text-ink-soft sm:text-base">Choose the option that applies to you.</p></div>
          <button ref={closeButtonRef} type="button" onClick={closeDialog} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-mist hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Close voting options"><X className="h-5 w-5" /></button>
        </header>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <AuthChoiceCard href={`/register?next=${next}`} icon={<UserPlus className="h-7 w-7" />} iconClassName="bg-primary-soft text-primary" title="Ndi mushya kuri uru rubuga" description="Fungura konti kugira ngo utangire gutora." buttonLabel="Fungura konti" buttonClassName="bg-primary text-white hover:bg-primary-dark" />
          <AuthChoiceCard href={`/login?next=${next}`} icon={<LogIn className="h-7 w-7" />} iconClassName="bg-accent-soft text-accent-dark" title="Nsanzwe mfite konti" description="Injira muri konti yawe ukomeze gutora." buttonLabel="Kwinjira" buttonClassName="border border-primary/30 text-primary hover:bg-primary-soft" />
        </div>
      </section>
    </div>}
  </>;
}

function AuthChoiceCard({ href, icon, iconClassName, title, description, buttonLabel, buttonClassName }: { href: string; icon: ReactNode; iconClassName: string; title: string; description: string; buttonLabel: string; buttonClassName: string }) {
  return <div className="flex min-w-0 flex-col rounded-2xl border border-primary-soft bg-surface p-5 shadow-sm sm:p-6">
    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconClassName}`}>{icon}</span><h3 className="mt-5 text-lg font-bold leading-6 text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
    <Link href={href} className={`mt-6 flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${buttonClassName}`}>{buttonLabel}</Link>
  </div>;
}
