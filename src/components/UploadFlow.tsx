"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, CheckCircle2, Table2 } from "lucide-react";
import type { ExtractedPolicy, RegisterRow } from "@/lib/types";

type Step = "idle" | "extracting" | "review" | "bulkReview" | "saving" | "done";

const FIELDS: { key: keyof ExtractedPolicy; label: string; type?: string }[] = [
  { key: "client_name", label: "Client name" },
  { key: "client_email", label: "Client email", type: "email" },
  { key: "client_phone", label: "Client phone" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "age", label: "Age", type: "number" },
  { key: "company", label: "Insurance company" },
  { key: "policy_type", label: "Policy type" },
  { key: "policy_number", label: "Policy number" },
  { key: "sum_insured", label: "Sum insured", type: "number" },
  { key: "premium", label: "Premium", type: "number" },
  { key: "start_date", label: "Start date", type: "date" },
  { key: "renewal_date", label: "Renewal date", type: "date" },
];

function fmtNum(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("en-IN");
}

export function UploadFlow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [form, setForm] = useState<ExtractedPolicy | null>(null);
  const [lowConf, setLowConf] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  // Bulk register state
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    duplicates: number;
    skippedNoName: number;
    clientsCreated: number;
  } | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setInfo(null);
    setStep("extracting");
    setFileName(file.name);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setFilePath(data.filePath);

      if (data.mode === "bulk" && Array.isArray(data.rows)) {
        setRows(data.rows);
        setStep("bulkReview");
        return;
      }

      setForm(data.extracted);
      setLowConf(data.extracted?.low_confidence_fields || []);
      if (data.message) setInfo(data.message);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("idle");
    }
  }

  function update<K extends keyof ExtractedPolicy>(
    key: K,
    value: ExtractedPolicy[K]
  ) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!form?.client_name?.trim()) {
      setError("Client name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source_file_path: filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.duplicate) setInfo("This policy already exists — opening it.");
      setStep("done");
      setTimeout(() => router.push(`/clients/${data.clientId}`), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  async function importBulk() {
    setStep("saving");
    setError(null);
    try {
      const res = await fetch("/api/policies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, source_file_path: filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setBulkResult({
        created: data.created ?? 0,
        duplicates: data.duplicates ?? 0,
        skippedNoName: data.skippedNoName ?? 0,
        clientsCreated: data.clientsCreated ?? 0,
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("bulkReview");
    }
  }

  // ---- DONE ----
  if (step === "done") {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <CheckCircle2 className="mx-auto text-green-600" size={40} />
        {bulkResult ? (
          <>
            <p className="mt-3 font-medium">
              Imported {bulkResult.created.toLocaleString("en-IN")} policies
            </p>
            <p className="text-sm text-muted mt-1">
              {bulkResult.clientsCreated.toLocaleString("en-IN")} new clients
              {bulkResult.duplicates > 0 &&
                ` · ${bulkResult.duplicates.toLocaleString("en-IN")} duplicates skipped`}
              {bulkResult.skippedNoName > 0 &&
                ` · ${bulkResult.skippedNoName} rows skipped (no name)`}
            </p>
            <button
              onClick={() => router.push("/clients")}
              className="mt-5 px-5 py-2.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition"
            >
              View clients
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 font-medium">Policy saved</p>
            <p className="text-sm text-muted">Taking you to the client…</p>
          </>
        )}
      </div>
    );
  }

  // ---- BULK REVIEW ----
  if (step === "bulkReview" || step === "saving") {
    const preview = rows.slice(0, 100);
    const named = rows.filter((r) => r.client_name && r.policy_number).length;
    const uniqueClients = new Set(
      rows
        .filter((r) => r.client_name)
        .map((r) => r.client_name!.trim().toLowerCase())
    ).size;

    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-2 text-sm">
          <Table2 size={16} className="text-muted" />
          {fileName}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{rows.length.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted">policies found</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{uniqueClients.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted">unique clients</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{named.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted">ready to import</p>
          </div>
        </div>

        <p className="text-sm text-muted">
          Existing policies (same policy number) are skipped automatically.
          Showing first {preview.length} of {rows.length.toLocaleString("en-IN")} rows.
        </p>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 bg-card border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                  <th className="px-3 py-3 font-semibold w-28">Policy No.</th>
                  <th className="px-3 py-3 font-semibold min-w-[160px]">Name</th>
                  <th className="px-3 py-3 font-semibold w-24">Plan</th>
                  <th className="px-3 py-3 font-semibold w-14">Mode</th>
                  <th className="px-3 py-3 font-semibold text-right w-24">Premium</th>
                  <th className="px-3 py-3 font-semibold text-right w-24">Sum Ass.</th>
                  <th className="px-3 py-3 font-semibold w-24">D.O.C.</th>
                  <th className="px-3 py-3 font-semibold w-24">Renewal</th>
                  <th className="px-3 py-3 font-semibold w-28">Mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((r, i) => (
                  <tr
                    key={`${r.policy_number}-${i}`}
                    className={`hover:bg-black/[.02] ${i % 2 === 0 ? "" : "bg-black/[.01]"}`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-muted">{r.policy_number}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {r.client_name || <span className="text-amber-500 text-xs">No name</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">{r.policy_type || "—"}</td>
                    <td className="px-3 py-2.5">
                      {r.mode ? (
                        <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-black/[.06]">
                          {r.mode}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">{fmtNum(r.premium)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">{fmtNum(r.sum_insured)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{r.start_date || "—"}</td>
                    <td className="px-3 py-2.5 text-xs">{r.renewal_date || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted font-mono">{r.client_phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && (
            <div className="px-4 py-2.5 border-t border-border bg-card text-xs text-muted">
              Showing first 100 of {rows.length.toLocaleString("en-IN")} rows — all will be imported.
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={importBulk}
            disabled={step === "saving"}
            className="px-5 py-2.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            {step === "saving" && <Loader2 size={16} className="animate-spin" />}
            {step === "saving"
              ? "Importing…"
              : `Import ${named.toLocaleString("en-IN")} policies`}
          </button>
          <button
            onClick={() => {
              setStep("idle");
              setRows([]);
            }}
            disabled={step === "saving"}
            className="px-5 py-2.5 rounded-full border border-border font-medium hover:bg-black/[.03] transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- SINGLE-POLICY REVIEW ----
  if (step === "review" && form) {
    return (
      <div className="space-y-5">
        {info && (
          <div className="rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">
            {info}
          </div>
        )}
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-2 text-sm">
          <FileText size={16} className="text-muted" />
          {fileName}
        </div>
        {lowConf.length > 0 && (
          <p className="text-sm text-amber-700">
            Please double-check: {lowConf.join(", ")}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => {
            const val = form[f.key];
            const flagged = lowConf.includes(f.key as string);
            return (
              <label key={f.key} className="block">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  {f.label}
                  {flagged && (
                    <span className="text-amber-500 text-xs">• check</span>
                  )}
                </span>
                <input
                  type={f.type || "text"}
                  value={val == null ? "" : String(val)}
                  onChange={(e) =>
                    update(
                      f.key,
                      (f.type === "number"
                        ? e.target.value === ""
                          ? null
                          : Number(e.target.value)
                        : e.target.value || null) as never
                    )
                  }
                  className={`mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10 ${
                    flagged ? "border-amber-300" : "border-border"
                  }`}
                />
              </label>
            );
          })}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save policy
          </button>
          <button
            onClick={() => {
              setStep("idle");
              setForm(null);
            }}
            className="px-5 py-2.5 rounded-full border border-border font-medium hover:bg-black/[.03] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- IDLE / UPLOAD ----
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={step === "extracting"}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.type === "application/pdf") handleFile(file);
          else if (file) setError("Only PDF files are supported.");
        }}
        className={`w-full rounded-2xl border-2 border-dashed bg-card p-12 text-center transition-all disabled:opacity-60 ${
          dragging ? "border-foreground bg-foreground/[.04]" : "border-border hover:border-foreground/30"
        }`}
      >
        {step === "extracting" ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-muted" size={32} />
            <p className="text-sm text-muted">
              Reading &amp; extracting {fileName}…
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="font-medium">Click to upload a policy PDF</p>
              <p className="text-sm text-muted mt-1">
                Single policy or a full policy register — PDF up to ~10MB
              </p>
            </div>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
