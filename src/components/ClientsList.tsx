"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronRight, X } from "lucide-react";

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
}

// Persist the search term so it survives page refresh and back-navigation
// (e.g. open a client, then tap "← All clients" — the search stays put).
const STORAGE_KEY = "clients-search-q";
const MODES_STORAGE_KEY = "clients-mode-filters";

const MODE_OPTIONS = [
  { value: "Monthly", label: "Monthly", match: ["MLY", "MONTHLY", "M"] },
  { value: "Quarterly", label: "Quarterly", match: ["QLY", "QUARTERLY", "Q"] },
  { value: "Half-Yearly", label: "Half-Yearly", match: ["HLY", "HALF-YEARLY", "HALF YEARLY", "H"] },
  { value: "Yearly", label: "Yearly", match: ["YLY", "YEARLY", "ANNUAL", "Y"] },
];

export function ClientsList({ clients }: { clients: Row[] }) {
  const [q, setQ] = useState("");
  const [selectedModes, setSelectedModes] = useState<Set<string>>(new Set());

  // Restore any previously typed search once, on mount (client-only to avoid
  // SSR hydration mismatch).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setQ(saved);
      
      const savedModes = sessionStorage.getItem(MODES_STORAGE_KEY);
      if (savedModes) {
        setSelectedModes(new Set(JSON.parse(savedModes)));
      }
    } catch {
      /* storage unavailable — ignore */
    }
  }, []);

  // Keep the stored value in sync with the input.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, q);
    } catch {
      /* ignore */
    }
  }, [q]);

  // Keep selected modes in sync with storage
  useEffect(() => {
    try {
      sessionStorage.setItem(MODES_STORAGE_KEY, JSON.stringify([...selectedModes]));
    } catch {
      /* ignore */
    }
  }, [selectedModes]);

  const toggleMode = (mode: string) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) {
        next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  };

  const clearModeFilters = () => {
    setSelectedModes(new Set());
  };

  const filtered = useMemo(() => {
    let result = clients;
    
    // Apply mode filters if any are selected
    if (selectedModes.size > 0) {
      result = result.filter((c) => {
        const clientModes = c.modes || [];
        // Check if any of the client's policy modes match any selected filter
        return [...selectedModes].some((selectedMode) => {
          const option = MODE_OPTIONS.find(opt => opt.value === selectedMode);
          if (!option) return false;
          return clientModes.some((mode) => 
            option.match.some(m => mode.toUpperCase().includes(m))
          );
        });
      });
    }
    
    // Apply search term
    const term = q.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(term) ||
          c.policyNumbers.some((n) => n.toLowerCase().includes(term)) ||
          (c.policyMeta || []).some((m) => m.toLowerCase().includes(term)) ||
          (c.email || "").toLowerCase().includes(term) ||
          (c.phone || "").toLowerCase().includes(term) ||
          (c.address || "").toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [q, clients, selectedModes]);

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

  return (
    <div className="space-y-5">
      {/* Mode Filter Checkboxes */}
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
        {selectedModes.size > 0 && (
          <p className="text-xs text-muted mt-2">
            Showing clients with {[...selectedModes].join(", ")} policies
          </p>
        )}
      </div>

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
            : selectedModes.size > 0 
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
