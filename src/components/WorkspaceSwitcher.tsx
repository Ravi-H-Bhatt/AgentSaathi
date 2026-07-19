"use client";

import { useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import type { Workspace } from "@/lib/workspace";

/**
 * Switches between the two independent dashboards ("Home" and "LIC").
 *
 * Uses a plain full-page navigation to a server route that sets the workspace
 * cookie and redirects to the dashboard. This is the most reliable approach on
 * mobile and the installed PWA — it bypasses the client router cache and any
 * service-worker caching, so the switch always takes effect and lands cleanly.
 */
export function WorkspaceSwitcher({ current }: { current: Workspace }) {
  const [busy, setBusy] = useState(false);

  const target: Workspace = current === "home" ? "lic" : "home";
  const label = target === "lic" ? "Go to LIC page" : "Go to Home page";
  const href = `/api/workspace?to=${target}&next=/dashboard`;

  return (
    <a
      href={href}
      onClick={() => setBusy(true)}
      title={`Currently in ${current === "lic" ? "LIC" : "Home"} — ${label}`}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 mb-1 rounded-lg text-sm font-medium border border-border bg-black/[.02] hover:bg-black/[.05] transition"
    >
      <span className="flex items-center gap-2">
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowRightLeft size={16} />
        )}
        {label}
      </span>
      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-foreground text-background">
        {current === "lic" ? "LIC" : "Home"}
      </span>
    </a>
  );
}
