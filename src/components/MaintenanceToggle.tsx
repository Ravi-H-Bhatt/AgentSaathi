"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Wrench, Loader2 } from "lucide-react";
import { toggleMaintenance } from "@/app/admin/actions";

/**
 * Admin control to turn the global "Work in Progress" screen on/off for all
 * agents. When ON, every agent/colleague screen shows the maintenance overlay
 * and auto-recovers once it's turned OFF.
 */
export function MaintenanceToggle({
  initialActive,
  initialMessage,
}: {
  initialActive: boolean;
  initialMessage: string | null;
}) {
  const [active, setActive] = useState(initialActive);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    setActive(next); // optimistic
    startTransition(async () => {
      try {
        await toggleMaintenance(next, message.trim() || undefined);
      } catch {
        setActive(!next); // revert on failure
      }
    });
  }

  return (
    <section
      className={`rounded-2xl border p-5 transition-colors ${
        active
          ? "border-amber-300 bg-amber-50"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              active ? "bg-amber-500 text-white" : "bg-black/[.06] text-foreground"
            }`}
          >
            <Wrench size={18} />
          </div>
          <div>
            <h2 className="font-semibold">Work in progress mode</h2>
            <p className="text-sm text-muted mt-0.5 max-w-md">
              {active
                ? "ON — all agents currently see the maintenance screen. Their app will auto-recover when you turn this off."
                : "OFF — agents are using the app normally. Turn on to show everyone a maintenance screen."}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={toggle}
          disabled={pending}
          aria-pressed={active}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            active ? "bg-amber-500" : "bg-black/[.15]"
          }`}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow ml-1"
            style={{ marginLeft: active ? "1.75rem" : "0.25rem" }}
          >
            {pending && <Loader2 size={12} className="animate-spin text-muted" />}
          </motion.span>
        </button>
      </div>

      {/* Optional custom message */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-muted mb-1.5">
          Message shown to agents (optional)
        </label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => {
            // Persist message if maintenance is currently ON.
            if (active) {
              startTransition(async () => {
                try {
                  await toggleMaintenance(true, message.trim() || undefined);
                } catch {
                  /* ignore */
                }
              });
            }
          }}
          placeholder="We'll be back shortly…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
        />
      </div>
    </section>
  );
}
