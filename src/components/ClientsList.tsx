"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronRight } from "lucide-react";

interface Row {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  policyCount: number;
  policyNumbers: string[];
}

export function ClientsList({ clients }: { clients: Row[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) ||
        c.policyNumbers.some((n) => n.toLowerCase().includes(term)) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term)
    );
  }, [q, clients]);

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
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, policy number, phone, or email…"
          className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted text-sm">
          {clients.length === 0
            ? "No clients yet. Upload a policy to get started."
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
                          <p className="font-medium truncate">{c.full_name}</p>
                          <p className="text-sm text-muted truncate">
                            {c.policyCount} {c.policyCount === 1 ? "policy" : "policies"}
                            {c.email ? ` · ${c.email}` : c.phone ? ` · ${c.phone}` : ""}
                          </p>
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
