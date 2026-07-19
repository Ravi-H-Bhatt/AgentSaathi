import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { getWorkspace, type Workspace } from "@/lib/workspace";
import { extractPdfText } from "@/lib/pdf";
import { extractPolicyFromText } from "@/lib/groq";
import { savePolicyForOwner } from "@/lib/policies";

export const runtime = "nodejs";
export const maxDuration = 60;

interface FileResult {
  fileName: string;
  status: "saved" | "duplicate" | "needs_review" | "error";
  clientId?: string;
  policyId?: string;
  clientName?: string | null;
  policyNumber?: string | null;
  message?: string;
}

/**
 * Upload a BUNDLE of single e-policy PDFs at once. Each file is stored,
 * its text extracted, parsed into structured fields, and saved to Supabase
 * with the same dedup rules as a single upload. Returns a per-file summary so
 * the UI can show exactly what was mapped.
 *
 * Files are processed in PARALLEL for maximum speed (6 at a time).
 * Files with no readable text (scans) or no client name are returned as
 * "needs_review" rather than silently dropped.
 */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).upload) {
    return NextResponse.json(
      { error: "You don't have permission to upload policies." },
      { status: 403 }
    );
  }

  const form = await request.formData();
  const category = (() => {
    const c = String(form.get("category") || "").toUpperCase();
    return c === "LIFE" || c === "GENERAL" ? (c as "LIFE" | "GENERAL") : null;
  })();

  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.type === "application/pdf");

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No PDF files provided" },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const workspace = await getWorkspace();
  const results: FileResult[] = [];

  // Process files in parallel (6 at a time for speed without overwhelming Groq).
  const BATCH_SIZE = 6;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((file) => processFile(file, db, ownerId, category, workspace))
    );
    results.push(...batchResults);
  }

  const saved = results.filter((r) => r.status === "saved").length;
  const duplicates = results.filter((r) => r.status === "duplicate").length;
  const needsReview = results.filter((r) => r.status === "needs_review").length;
  const errors = results.filter((r) => r.status === "error").length;

  await logActivity(
    agent,
    "bundle_upload",
    `${saved} saved, ${duplicates} duplicates, ${needsReview} to review, ${errors} errors`,
    workspace
  );

  return NextResponse.json({
    ok: true,
    total: files.length,
    saved,
    duplicates,
    needsReview,
    errors,
    results,
  });
}

async function processFile(
  file: File,
  db: ReturnType<typeof createAdminClient>,
  ownerId: string,
  category: "LIFE" | "GENERAL" | null,
  workspace: Workspace
): Promise<FileResult> {
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${ownerId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;

    // Upload file to storage
    const { error: upErr } = await db.storage
      .from("policy-files")
      .upload(path, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) {
      return {
        fileName: file.name,
        status: "error",
        message: "Storage upload failed: " + upErr.message,
      };
    }

    // Extract text
    const text = await extractPdfText(bytes);
    if (!text || text.length < 20) {
      return {
        fileName: file.name,
        status: "needs_review",
        message: "No text found (scanned image)",
      };
    }

    // AI extraction
    const extracted = await extractPolicyFromText(text, category);
    if (!extracted.client_name || !extracted.client_name.trim()) {
      return {
        fileName: file.name,
        status: "needs_review",
        message: "No client name found",
        policyNumber: extracted.policy_number,
      };
    }

    // Save to database (client_name is guaranteed to be non-null here)
    const saved = await savePolicyForOwner(ownerId, {
      client_name: extracted.client_name, // Non-null (workspace passed below)
      client_email: extracted.client_email,
      client_phone: extracted.client_phone,
      date_of_birth: extracted.date_of_birth,
      age: extracted.age,
      company: extracted.company,
      policy_type: extracted.policy_type,
      policy_number: extracted.policy_number,
      sum_insured: extracted.sum_insured,
      premium: extracted.premium,
      start_date: extracted.start_date,
      renewal_date: extracted.renewal_date,
      source_file_path: path,
    }, workspace);

    return {
      fileName: file.name,
      status: saved.duplicate ? "duplicate" : "saved",
      clientId: saved.clientId,
      policyId: saved.policyId,
      clientName: extracted.client_name,
      policyNumber: extracted.policy_number,
    };
  } catch (e) {
    console.error(`[bundle] Error processing ${file.name}:`, e);
    return {
      fileName: file.name,
      status: "error",
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
