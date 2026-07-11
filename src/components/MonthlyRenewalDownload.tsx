"use client";

import { useState } from "react";
import { CalendarDays, Download, ChevronDown } from "lucide-react";
import { downloadRenewalsByMonthPdf } from "@/lib/clientPdf";
import type { ClientWithPolicies } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Lets the agent pick a month and download a PDF of all policies renewing in
 * that month (recurring dd/mm — matches the month regardless of year).
 */
export function MonthlyRenewalDownload({
  clients,
  agentName,
}: {
  clients: ClientWithPolicies[];
  agentName: string;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());

  // Count policies renewing per month for a helpful hint on each option.
  const counts = new Array(12).fill(0);
  for (const c of clients) {
    for (const p of c.policies) {
      if (!p.renewal_date) continue;
      const d = new Date(p.renewal_date);
      if (!isNaN(d.getTime())) counts[d.getMonth()]++;
    }
  }

  function download() {
    downloadRenewalsByMonthPdf(clients, agentName, month);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="inline-flex items-stretch rounded-full border border-border overflow-hidden">
        {/* Month selector */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 hover:bg-black/[.03] transition"
        >
          <CalendarDays size={16} className="text-muted" />
          <span>{MONTHS[month]}</span>
          <span className="text-xs text-muted">({counts[month]})</span>
          <ChevronDown size={14} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {/* Download */}
        <button
          onClick={download}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-foreground text-background hover:opacity-90 transition"
          title={`Download ${MONTHS[month]} renewals as PDF`}
        >
          <Download size={16} />
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-20 w-52 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg py-1">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => {
                  setMonth(i);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-black/[.04] transition ${
                  i === month ? "font-semibold" : ""
                }`}
              >
                <span>{m}</span>
                <span className="text-xs text-muted">{counts[i]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
