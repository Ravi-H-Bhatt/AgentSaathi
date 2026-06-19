"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, CheckCircle2 } from "lucide-react";
import type { ExtractedPolicy } from "@/lib/types";

type Step = "idle" | "extracting" | "review" | "done";

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
      setForm(data.extracted);
      setLowConf(data.extracted.low_confidence_fields || []);
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
      setStep("done");
      setTimeout(() => router.push(`/clients/${data.clientId}`), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <CheckCircle2 className="mx-auto text-green-600" size={40} />
        <p className="mt-3 font-medium">Policy saved</p>
        <p className="text-sm text-muted">Taking you to the client…</p>
      </div>
    );
  }

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

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={step === "extracting"}
        className="w-full rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center hover:border-foreground/30 transition disabled:opacity-60"
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
              <p className="text-sm text-muted mt-1">PDF up to ~10MB</p>
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
