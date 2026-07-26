"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronRight, X, Download } from "lucide-react";
import { licModeMonths } from "@/lib/lic-renewal";
import { downloadAllClientsPdf } from "@/lib/clientPdf";
import type { ClientWithPolicies } from "@/lib/types";

interface Row {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  policyCount: number;
  policyNumbers: string[];
  /** Searchable policy metadata: policy types, product names, insurers. */
  policyMeta?: string[];
  /** Payment modes from policies (for filtering) */
  modes?: string[];
  /** Motor-specific fields: registration number, make, model */
  motorFields?: string[];
}

// Persist the search term so it survives page refresh and back-navigation
// (e.g. open a client, then tap "← All clients" — the search stays put).
const STORAGE_KEY = "clients-search-q";
const MODES_STORAGE_KEY = "clients-mode-filters";

// Payment-mode filter options. Each maps to a canonical "months per cycle"
// value (Monthly=1, Quarterly=3, Half-Yearly=6, Yearly=12) so matching is
// EXACT — selecting "Yearly" never accidentally matches "Half-Yearly".
const MODE_OPTIONS = [
  { value: "Monthly", label: "Monthly", months: 1 },
  { value: "Quarterly", label: "Quarterly", months: 3 },
  { value: "Half-Yearly", label: "Half-Yearly", months: 6 },
  { value: "Yearly", label: "Yearly", months: 12 },
];

export function ClientsList({
  clients,
  showModeFilter = false,
  fullClients = [],
  agentName = "",
}: {
  clients: Row[];
  /** Show payment-mode checkboxes (LIC workspace only). */
  showModeFilter?: boolean;
  /** Full client+policies data, used to download the filtered set (LIC only). */
  fullClients?: ClientWithPolicies[];
  agentName?: string;
}) {
  const [q, setQ] = useState("");
  const [selectedModes, setSelectedModes] = useState<Set<string>>(new Set());

  // Restore any previously typed search once, on mount (client-only to avoid
  // SSR hydration mismatch).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setQ(saved);

      if (showModeFilter) {
        const savedModes = sessionStorage.getItem(MODES_STORAGE_KEY);
        if (savedModes) setSelectedModes(new Set(JSON.parse(savedModes)));
      }
    } catch {
      /* storage unavailable — ignore */
    }
  }, [showModeFilter]);

  // Keep the stored value in sync with the input.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, q);
    } catch {
      /* ignore */
    }
  }, [q]);

  // Keep selected modes in sync with storage.
  useEffect(() => {
    if (!showModeFilter) return;
    try {
      sessionStorage.setItem(MODES_STORAGE_KEY, JSON.stringify([...selectedModes]));
    } catch {
      /* ignore */
    }
  }, [selectedModes, showModeFilter]);

  const toggleMode = (mode: string) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  };

  const clearModeFilters = () => setSelectedModes(new Set());

  // The set of month-cycle values selected (1/3/6/12).
  const selectedMonths = useMemo(() => {
    const set = new Set<number>();
    for (const v of selectedModes) {
      const opt = MODE_OPTIONS.find((o) => o.value === v);
      if (opt) set.add(opt.months);
    }
    return set;
  }, [selectedModes]);

  // Does a client have at least one policy matching a selected mode?
  const clientMatchesModes = (modes: string[] | undefined): boolean => {
    if (selectedMonths.size === 0) return true;
    return (modes || []).some((m) => {
      const months = licModeMonths(m);
      return months != null && selectedMonths.has(months);
    });
  };

  const filtered = useMemo(() => {
    let result = clients;

    // Apply mode filters (LIC only) — EXACT match by cycle length.
    if (showModeFilter && selectedMonths.size > 0) {
      result = result.filter((c) => clientMatchesModes(c.modes));
    }

    // Apply search term.
    const term = q.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(term) ||
          c.policyNumbers.some((n) => n.toLowerCase().includes(term)) ||
          (c.policyMeta || []).some((m) => m.toLowerCase().includes(term)) ||
          (c.motorFields || []).some((m) => m.toLowerCase().includes(term)) ||
          (c.email || "").toLowerCase().includes(term) ||
          (c.phone || "").toLowerCase().includes(term) ||
          (c.address || "").toLowerCase().includes(term)
      );
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, clients, selectedMonths, showModeFilter]);

  // Group alphabetically by first letter.
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const c of filtered) {
      const letter = (c.full_name[0] || "#").toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      (map.get(key) || map.set(key, []).get(key)!).push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // Download the currently-filtered clients (LIC). When modes are selected,
  // each client keeps only the policies matching those modes so the report
  // reflects exactly what's shown.
  const downloadFiltered = () => {
    const filteredIds = new Set(filtered.map((c) => c.id));
    let out = fullClients.filter((c) => filteredIds.has(c.id));
    if (selectedMonths.size > 0) {
      out = out
        .map((c) => ({
          ...c,
          policies: c.policies.filter((p) => {
            const months = licModeMonths(p.mode);
            return months != null && selectedMonths.has(months);
          }),
        }))
        .filter((c) => c.policies.length > 0);
    }
    downloadAllClientsPdf(out, agentName || "AgentSaathi");
  };

  return (
    <div className="space-y-5">
      {/* Mode Filter Checkboxes — LIC workspace only */}
      {showModeFilter && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Filter by Payment Mode</p>
            {selectedModes.size > 0 && (
              <button
                onClick={clearModeFilters}
                className="text-xs text-muted hover:text-foreground transition"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {MODE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-black/[.02] cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selectedModes.has(option.value)}
                  onChange={() => toggleMode(option.value)}
                  className="rounded border-border text-foreground focus:ring-2 focus:ring-foreground/10"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <p className="text-xs text-muted">
              {selectedModes.size > 0
                ? `Showing ${filtered.length} client${filtered.length === 1 ? "" : "s"} with ${[...selectedModes].join(", ")} policies`
                : "Select one or more modes to filter."}
            </p>
            <button
              onClick={downloadFiltered}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
            >
              <Download size={16} />
              {selectedModes.size > 0 ? "Download filtered (PDF)" : "Download list (PDF)"}
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, policy number, policy type, product, phone, email…"
          className="w-full rounded-xl border border-border bg-card pl-11 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {q.trim() && (
        <p className="text-xs text-muted -mt-2 px-1">
          {filtered.length} {filtered.length === 1 ? "match" : "matches"} for "{q.trim()}"
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted text-sm">
          {clients.length === 0
            ? "No clients yet. Upload a policy to get started."
            : showModeFilter && selectedModes.size > 0
            ? "No clients match the selected payment modes."
            : "No clients match your search."}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([letter, rows]) => (
            <div key={letter}>
              <p className="text-xs font-semibold text-muted px-1 mb-2">
                {letter}
              </p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {rows.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3), ease: "easeOut" }}
                  >
                    <Link
                      href={`/clients/${c.id}`}
                      className="group flex items-center justify-between px-5 py-4 hover:bg-black/[.02] hover:pl-6 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold shrink-0 transition-transform duration-200 group-hover:scale-110">
                          {c.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{c.full_name}</p>
                          <p className="text-sm text-muted truncate">
                            {c.policyCount} {c.policyCount === 1 ? "policy" : "policies"}
                            {c.email ? ` · ${c.email}` : c.phone ? ` · ${c.phone}` : ""}
                          </p>
                          {c.address && (
                            <p className="text-xs text-muted truncate mt-0.5">
                              📍 {c.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-muted shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
