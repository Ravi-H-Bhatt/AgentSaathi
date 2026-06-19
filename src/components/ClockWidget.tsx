"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Square } from "lucide-react";
import { clockIn, clockOut } from "@/app/(app)/colleagues/actions";

export function ClockWidget({ openSince }: { openSince: string | null }) {
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const active = !!openSince;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [active]);

  const elapsed = openSince
    ? formatElapsed(now - new Date(openSince).getTime())
    : null;

  return (
    <button
      onClick={() =>
        startTransition(() => (active ? clockOut() : clockIn()))
      }
      disabled={pending}
      title={active ? "Clock out" : "Clock in"}
      className={`inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 ${
        active
          ? "bg-green-50 text-green-700 border border-green-200"
          : "border border-border hover:bg-black/[.03]"
      }`}
    >
      {active ? (
        <>
          <span className="h-2 w-2 rounded-full bg-green-500 soft-pulse" />
          <span className="hidden sm:inline">{elapsed}</span>
          <Square size={14} className="fill-current" />
        </>
      ) : (
        <>
          <Play size={14} className="fill-current" />
          <span className="hidden sm:inline">Clock in</span>
        </>
      )}
    </button>
  );
}

function formatElapsed(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
