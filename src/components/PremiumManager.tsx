"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, Trash2, Plus } from "lucide-react";
import { money } from "@/lib/format";
import {
  addPremiumRow,
  addPremiumRows,
  deletePremiumRow,
} from "@/app/admin/actions";
import type { PremiumChart } from "@/lib/types";

interface ParsedRow {
  policy_type: string | null;
  age_min: number;
  age_max: number;
  sum_insured: number | null;
  premium: number;
}

export function PremiumManager({
  initialCharts,
}: {
  initialCharts: PremiumChart[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setUploading(true);
    setMsg(null);
    setParsed([]);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/extract-premiums", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      setParsed(data.rows || []);
      if (data.message) setMsg(data.message);
      else if ((data.rows || []).length === 0)
        setMsg("No rows found. Add manually below.");
    } catch {
      setMsg("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function confirmParsed() {
    if (parsed.length === 0) return;
    startTransition(async () => {
      await addPremiumRows(parsed);
      setParsed([]);
      setMsg(`Added ${parsed.length} rows.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Upload */}
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center hover:border-foreground/30 transition disabled:opacity-60"
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <Loader2 size={18} className="animate-spin" /> Parsing chart…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <UploadCloud size={18} /> Upload premium chart PDF
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {msg && <p className="text-sm text-muted mt-3">{msg}</p>}
      </div>

      {/* Parsed preview */}
      {parsed.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-medium text-amber-900 mb-3">
            Review {parsed.length} parsed rows before saving
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-amber-800">
                <tr>
                  <th className="py-1 pr-4">Type</th>
                  <th className="py-1 pr-4">Age min</th>
                  <th className="py-1 pr-4">Age max</th>
                  <th className="py-1 pr-4">Sum insured</th>
                  <th className="py-1 pr-4">Premium</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((r, i) => (
                  <tr key={i} className="border-t border-amber-200">
                    <td className="py-1.5 pr-4">{r.policy_type || "—"}</td>
                    <td className="py-1.5 pr-4">{r.age_min}</td>
                    <td className="py-1.5 pr-4">{r.age_max}</td>
                    <td className="py-1.5 pr-4">{money(r.sum_insured)}</td>
                    <td className="py-1.5 pr-4">{money(r.premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={confirmParsed}
              disabled={pending}
              className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {pending ? "Saving…" : `Save ${parsed.length} rows`}
            </button>
            <button
              onClick={() => setParsed([])}
              className="px-4 py-2 rounded-full border border-amber-300 text-sm font-medium hover:bg-amber-100 transition"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Manual add */}
      <form
        action={addPremiumRow}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <p className="font-medium mb-3 flex items-center gap-2">
          <Plus size={16} /> Add a row manually
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input name="policy_type" label="Type" placeholder="Health" />
          <Input name="age_min" label="Age min" type="number" required />
          <Input name="age_max" label="Age max" type="number" required />
          <Input name="sum_insured" label="Sum insured" type="number" />
          <Input name="premium" label="Premium" type="number" required />
          <div className="flex items-end">
            <button className="w-full px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition">
              Add
            </button>
          </div>
        </div>
      </form>

      {/* Existing rows */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">
            Current chart{" "}
            <span className="text-muted font-normal">
              ({initialCharts.length} rows)
            </span>
          </h2>
        </div>
        {initialCharts.length === 0 ? (
          <p className="px-5 py-10 text-center text-muted text-sm">
            No premium rows yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted border-b border-border">
                <tr>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Age band</th>
                  <th className="px-5 py-3">Sum insured</th>
                  <th className="px-5 py-3">Premium</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {initialCharts.map((c) => (
                  <PremiumRowItem key={c.id} chart={c} onRefresh={() => router.refresh()} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PremiumRowItem({
  chart,
  onRefresh,
}: {
  chart: PremiumChart;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3">{chart.policy_type || "—"}</td>
      <td className="px-5 py-3">
        {chart.age_min}–{chart.age_max}
      </td>
      <td className="px-5 py-3">{money(chart.sum_insured)}</td>
      <td className="px-5 py-3">{money(chart.premium)}</td>
      <td className="px-5 py-3 text-right">
        <button
          onClick={() =>
            startTransition(async () => {
              await deletePremiumRow(chart.id);
              onRefresh();
            })
          }
          disabled={pending}
          className="text-muted hover:text-red-600 transition disabled:opacity-50"
          aria-label="Delete row"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

function Input({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
}
