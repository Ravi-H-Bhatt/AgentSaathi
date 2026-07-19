"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import type { Workspace } from "@/lib/workspace";

/**
 * Switches between the two independent dashboards ("Home" and "LIC").
 * The active workspace lives in a server cookie; clicking flips it, then we
 * navigate to the dashboard and refresh so fresh (workspace-scoped) data loads.
 * The two datasets never mix.
 */
export function WorkspaceSwitcher({ current }: { current: Workspace }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const target: Workspace = current === "home" ? "lic" : "home";
  const label = target === "lic" ? "Go to LIC page" : "Go to Home page";

  async function switchTo() {
    setBusy(true);
    try {
      await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: target }),
      });
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={switchTo}
      disabled={busy || pending}
      title={`Currently in ${current === "lic" ? "LIC" : "Home"} — ${label}`}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 mb-1 rounded-lg text-sm font-medium border border-border bg-black/[.02] hover:bg-black/[.05] transition disabled:opacity-60"
    >
      <span className="flex items-center gap-2">
        {busy || pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowRightLeft size={16} />
        )}
        {label}
      </span>
      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-foreground text-background">
        {current === "lic" ? "LIC" : "Home"}
      </span>
    </button>
  );
}
