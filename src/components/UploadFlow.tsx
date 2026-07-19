"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, CheckCircle2, Table2, Package } from "lucide-react";
import type { ExtractedPolicy, RegisterRow } from "@/lib/types";
import type { LicDueRow } from "@/lib/lic-premium-due";
import { companyLabel, shortDate } from "@/lib/format";
import { getLicNextDueISO } from "@/lib/lic-renewal";

type Step = "idle" | "extracting" | "review" | "bulkReview" | "saving" | "done" | "bundleUploading" | "bundleDone";
type Category = "LIFE" | "GENERAL" | null;

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

export function UploadFlow({ fileType = "pdf" }: { fileType?: "pdf" | "xlsx" }) {
  const router = useRouter();
  const singleInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [form, setForm] = useState<ExtractedPolicy | null>(null);
  const [lowConf, setLowConf] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState<Category>(null);

  // Bulk register state
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [registerType, setRegisterType] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    duplicates: number;
    skippedNoName: number;
    skippedConflict: number;
    clientsCreated: number;
  } | null>(null);

  // Bundle upload state
  const [bundleResults, setBundleResults] = useState<{
    total: number;
    saved: number;
    duplicates: number;
    needsReview: number;
    errors: number;
    results: Array<{
      fileName: string;
      status: string;
      clientName?: string | null;
      policyNumber?: string | null;
      message?: string;
    }>;
  } | null>(null);

  // Cleanup on unmount to prevent stuck states
  useEffect(() => {
    return () => {
      setStep("idle");
      setSaving(false);
    };
  }, []);

  async function handleFile(file: File) {
    setError(null);
    setInfo(null);
    setStep("extracting");
    setFileName(file.name);
    setFilePath(null);
    setForm(null);
    setRows([]);

    const fd = new FormData();
    fd.append("file", file);
    if (category) fd.append("category", category);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server error: ${text.slice(0, 200)}`);
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setFilePath(data.filePath);

      if (data.mode === "bulk" && Array.isArray(data.rows)) {
        setRows(data.rows);
        setRegisterType(data.registerType || null);
        setStep("bulkReview");
        return;
      }

      // Single policy - auto-import immediately
      setForm(data.extracted);
      setLowConf(data.extracted?.low_confidence_fields || []);
      if (data.message) setInfo(data.message);
      
      // Auto-save without showing review step
      if (data.extracted?.client_name?.trim()) {
        setStep("saving");
        try {
          const saveRes = await fetch("/api/policies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              ...data.extracted, 
              source_file_path: data.filePath 
            }),
          });
          const saveData = await saveRes.json();
          if (!saveRes.ok) throw new Error(saveData.error || "Save failed");
          
          setStep("done");
          if (saveData.duplicate) {
            setInfo("This policy already exists.");
          } else {
            setInfo("Policy saved successfully!");
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed");
          setStep("review"); // Fall back to review on error
        }
      } else {
        // No client name - show review
        setStep("review");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("idle");
    }
  }

  async function handleBundle(files: FileList) {
    setError(null);
    setInfo(null);
    setStep("bundleUploading");
    setBundleResults(null);
    const fd = new FormData();
    if (category) fd.append("category", category);
    for (let i = 0; i < files.length; i++) {
      if (files[i].type === "application/pdf") fd.append("files", files[i]);
    }
    try {
      const res = await fetch("/api/policies/upload-bundle", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setBundleResults(data);
      setStep("bundleDone");
      // Refresh router after a short delay to prevent UI freeze
      setTimeout(() => router.refresh(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
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
      if (data.duplicate) setInfo("This policy already exists.");
      else setInfo("Policy saved successfully!");
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function importBulk() {
    setStep("saving");
    setError(null);
    try {
      // LIC "Premium Due List" uses its own endpoint (dedup by policy number,
      // mode-aware renewal storage). Everything else uses the generic importer.
      const endpoint =
        registerType === "lic-premium-due"
          ? "/api/policies/lic"
          : "/api/policies/bulk";
      const res = await fetch(endpoint, {
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
        skippedConflict: data.skippedConflict ?? 0,
        clientsCreated: data.clientsCreated ?? 0,
      });
      setStep("done");
      // Refresh router after a short delay to prevent UI freeze
      setTimeout(() => router.refresh(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("bulkReview");
    }
  }

  // ---- DONE ----
  if (step === "done") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto text-green-600" size={40} />
          {bulkResult ? (
            <>
              <p className="mt-3 text-lg font-semibold">
                Imported {bulkResult.created.toLocaleString("en-IN")} new policies
              </p>
              <p className="text-sm text-muted mt-1">
                {bulkResult.clientsCreated.toLocaleString("en-IN")} new clients created
              </p>

              {/* Detailed breakdown so nothing is hidden */}
              <div className="mt-5 mx-auto max-w-sm text-left rounded-xl border border-border bg-black/[.02] divide-y divide-border text-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted">✅ Newly imported</span>
                  <span className="font-semibold text-green-700">
                    {bulkResult.created.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted">🔁 Already in system (identical)</span>
                  <span className="font-semibold">
                    {bulkResult.duplicates.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted">⚠️ Blocked (same policy number)</span>
                  <span
                    className={`font-semibold ${
                      bulkResult.skippedConflict > 0 ? "text-amber-700" : ""
                    }`}
                  >
                    {bulkResult.skippedConflict.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted">⏭️ Skipped (no client name)</span>
                  <span className="font-semibold">
                    {bulkResult.skippedNoName.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {bulkResult.skippedConflict > 0 && (
                <p className="text-xs text-amber-700 mt-3 max-w-sm mx-auto">
                  These {bulkResult.skippedConflict.toLocaleString("en-IN")} policies
                  share a policy number with an existing one but have different
                  details. To store them too, drop the unique policy_number
                  constraint in the database (RUN_THIS_IN_SUPABASE.sql).
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-3 font-medium">Policy saved successfully!</p>
              {info && <p className="text-sm text-muted mt-1">{info}</p>}
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep("idle");
              setForm(null);
              setRows([]);
              setRegisterType(null);
              setBulkResult(null);
              setError(null);
              setInfo(null);
              setFileName("");
              setFilePath(null);
              setCategory(null);
              if (singleInputRef.current) singleInputRef.current.value = "";
              if (bundleInputRef.current) bundleInputRef.current.value = "";
            }}
            className="px-5 py-2.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition"
          >
            Upload more
          </button>
          <button
            onClick={() => router.push("/clients")}
            className="px-5 py-2.5 rounded-full border border-border font-medium hover:bg-black/[.03] transition"
          >
            View clients
          </button>
        </div>
      </div>
    );
  }

  // ---- BUNDLE DONE ----
  if (step === "bundleDone" && bundleResults) {
    const r = bundleResults;
    const hasIssues = r.needsReview > 0 || r.errors > 0;
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto text-green-600" size={40} />
          <p className="mt-3 font-medium">
            Processed {r.total} {r.total === 1 ? "file" : "files"}
          </p>
          <p className="text-sm text-muted mt-1">
            {r.saved} saved · {r.duplicates} duplicates
            {hasIssues && ` · ${r.needsReview} to review · ${r.errors} errors`}
          </p>
        </div>
        {hasIssues && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-left text-xs text-muted uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">File</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Policy #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.results
                    .filter((res) => res.status === "needs_review" || res.status === "error")
                    .map((res, i) => (
                      <tr key={i} className="hover:bg-black/[.02]">
                        <td className="px-4 py-3 font-mono text-xs">{res.fileName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              res.status === "needs_review"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {res.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{res.clientName || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{res.policyNumber || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep("idle");
              setBundleResults(null);
              setCategory(null);
              setError(null);
              setInfo(null);
              setFileName("");
              setFilePath(null);
              if (bundleInputRef.current) bundleInputRef.current.value = "";
            }}
            className="px-5 py-2.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition"
          >
            Upload more
          </button>
          <button
            onClick={() => router.push("/clients")}
            className="px-5 py-2.5 rounded-full border border-border font-medium hover:bg-black/[.03] transition"
          >
            View clients
          </button>
        </div>
      </div>
    );
  }

  // ---- LIC PREMIUM DUE LIST REVIEW (dedicated table: S.No + real columns) ----
  if (
    (step === "bulkReview" || step === "saving") &&
    registerType === "lic-premium-due"
  ) {
    const licRows = (rows as LicDueRow[])
      .slice()
      .sort((a, b) => (a.sn ?? 0) - (b.sn ?? 0));
    const uniqueClients = new Set(
      licRows
        .filter((r) => r.client_name)
        .map((r) => r.client_name!.trim().toLowerCase())
    ).size;

    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-2 text-sm">
          <Table2 size={16} className="text-muted" />
          {fileName}
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
            LIC Premium Due List
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{licRows.length.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted">policies found</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{uniqueClients.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted">unique clients</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{licRows.length.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted">ready to import</p>
          </div>
        </div>

        <p className="text-sm text-muted">
          Dedup is by policy number — each policy is stored once even across
          monthly reports. Showing all {licRows.length.toLocaleString("en-IN")} rows.
        </p>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 bg-card border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                  <th className="px-3 py-3 font-semibold w-14">S.No</th>
                  <th className="px-3 py-3 font-semibold w-28">Policy No</th>
                  <th className="px-3 py-3 font-semibold min-w-[180px]">Name of Assured</th>
                  <th className="px-3 py-3 font-semibold w-24">D.o.C</th>
                  <th className="px-3 py-3 font-semibold w-20">Pln/Tm</th>
                  <th className="px-3 py-3 font-semibold w-24">Mode</th>
                  <th className="px-3 py-3 font-semibold w-20">FUP</th>
                  <th className="px-3 py-3 font-semibold text-right w-24">Premium</th>
                  <th className="px-3 py-3 font-semibold w-24">Next due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {licRows.map((r, i) => {
                  const nextDue = getLicNextDueISO(r.start_date, r.mode);
                  return (
                    <tr
                      key={`${r.policy_number}-${i}`}
                      className={`hover:bg-black/[.02] ${i % 2 === 0 ? "" : "bg-black/[.01]"}`}
                    >
                      <td className="px-3 py-2.5 text-xs text-muted tabular-nums">{r.sn ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.policy_number}</td>
                      <td className="px-3 py-2.5 font-medium">
                        {r.client_name || <span className="text-amber-500 text-xs">No name</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted whitespace-nowrap">
                        {r.start_date ? shortDate(r.start_date) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.policy_type || "—"}</td>
                      <td className="px-3 py-2.5">
                        {r.mode ? (
                          <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-black/[.06] whitespace-nowrap">
                            {r.mode}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted">{r.fup || "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                        {fmtNum(r.premium)}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {nextDue ? shortDate(nextDue) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              : `Import ${licRows.length.toLocaleString("en-IN")} policies`}
          </button>
          <button
            onClick={() => {
              setStep("idle");
              setRows([]);
              setRegisterType(null);
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

  // ---- BULK REVIEW ----
  if (step === "bulkReview" || step === "saving") {
    const preview = rows.slice(0, 100);
    // Count rows with client_name (policy_number is optional)
    const named = rows.filter((r) => r.client_name).length;
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
                  <th className="px-3 py-3 font-semibold w-24">Company</th>
                  <th className="px-3 py-3 font-semibold min-w-[200px]">Address</th>
                  <th className="px-3 py-3 font-semibold min-w-[180px]">Product</th>
                  <th className="px-3 py-3 font-semibold w-20">Type</th>
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
                    <td className="px-3 py-2.5 text-xs">
                      {companyLabel(r.company, r.product_name) || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {r.client_address ? (
                        <div className="max-w-[200px] truncate" title={r.client_address}>
                          {r.client_address}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="font-medium">{r.product_name || r.policy_type || "—"}</div>
                      {r.product_name && r.policy_type && (
                        <div className="text-muted text-[10px] mt-0.5">{r.policy_type}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.policy_holder_type ? (
                        <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                          {r.policy_holder_type}
                        </span>
                      ) : "—"}
                    </td>
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
              setRegisterType(null);
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
    <div className="space-y-6">
      {/* Category selector */}
      <div>
        <label className="block text-sm font-medium mb-3">Policy category</label>
        <div className="inline-flex gap-1 p-1 rounded-2xl bg-black/[.04]">
          <button
            onClick={() => setCategory("LIFE")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              category === "LIFE"
                ? "bg-foreground text-background shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-black/[.03]"
            }`}
          >
            Life Insurance (LIC)
          </button>
          <button
            onClick={() => setCategory("GENERAL")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              category === "GENERAL"
                ? "bg-foreground text-background shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-black/[.03]"
            }`}
          >
            General Insurance (GIC)
          </button>
          <button
            onClick={() => setCategory(null)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              category === null
                ? "bg-foreground text-background shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-black/[.03]"
            }`}
          >
            Auto-detect
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Single File */}
        <div className="min-h-[320px]">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            {fileType === "xlsx" ? <Table2 size={18} /> : <FileText size={18} />} 
            Upload single {fileType === "xlsx" ? "spreadsheet" : "policy"}
          </h3>
          <button
            type="button"
            onClick={() => singleInputRef.current?.click()}
            disabled={step === "extracting" || step === "bundleUploading"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              const acceptedType = fileType === "xlsx" 
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : "application/pdf";
              if (file && file.type === acceptedType) handleFile(file);
              else if (file) setError(`Only ${fileType.toUpperCase()} files are supported.`);
            }}
            className={`w-full rounded-2xl border-2 border-dashed bg-card p-10 text-center transition-all disabled:opacity-60 ${
              dragging
                ? "border-foreground bg-foreground/[.04] scale-[1.02]"
                : "border-border hover:border-foreground/30 hover:bg-black/[.02]"
            }`}
          >
            {step === "extracting" ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-muted" size={32} />
                <p className="text-sm text-muted">Reading {fileType.toUpperCase()}...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-foreground text-background flex items-center justify-center">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <p className="font-medium text-sm">Click or drop {fileType.toUpperCase()}</p>
                  <p className="text-xs text-muted mt-1">
                    {fileType === "xlsx" 
                      ? "Excel file with policy data" 
                      : "One policy schedule or register"}
                  </p>
                </div>
              </div>
            )}
          </button>
          <input
            ref={singleInputRef}
            type="file"
            accept={fileType === "xlsx" 
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
              : "application/pdf"}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Bundle */}
        <div className="min-h-[320px]">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Package size={18} /> Upload {fileType === "xlsx" ? "multiple spreadsheets" : "policy bundle"}
          </h3>
          <button
            type="button"
            onClick={() => bundleInputRef.current?.click()}
            disabled={step === "extracting" || step === "bundleUploading"}
            className="w-full rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center transition-all hover:border-foreground/30 hover:bg-black/[.02] hover:scale-[1.01] disabled:opacity-60"
          >
            {step === "bundleUploading" ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-muted" size={32} />
                <p className="text-sm text-muted">Processing...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-foreground text-background flex items-center justify-center">
                  <Package size={22} />
                </div>
                <div>
                  <p className="font-medium text-sm">Click to select files</p>
                  <p className="text-xs text-muted mt-1">
                    {fileType === "xlsx" 
                      ? "Multiple Excel files at once" 
                      : "Multiple e-policy PDFs at once"}
                  </p>
                </div>
              </div>
            )}
          </button>
          <input
            ref={bundleInputRef}
            type="file"
            accept={fileType === "xlsx" 
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
              : "application/pdf"}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleBundle(e.target.files);
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
