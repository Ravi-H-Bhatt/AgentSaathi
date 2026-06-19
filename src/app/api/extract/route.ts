import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { extractPdfText } from "@/lib/pdf";
import { extractPolicyFromText } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Accepts a single PDF file (multipart/form-data, field "file").
 * Stores it in the agent's storage folder, extracts text, and returns
 * structured (editable) fields plus the storage path.
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
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);

  // Store original under {ownerId}/{timestamp}-{filename}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${ownerId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await db.storage
    .from("policy-files")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });

  if (upErr) {
    return NextResponse.json(
      { error: "Upload failed: " + upErr.message },
      { status: 500 }
    );
  }

  await logActivity(agent, "upload_policy", file.name);

  // Extract text layer.
  const text = await extractPdfText(bytes);

  if (!text || text.length < 20) {
    return NextResponse.json({
      filePath: path,
      fileName: file.name,
      scanned: true,
      message:
        "This PDF has no readable text layer (it may be a scan/image). Please enter the details manually.",
      extracted: emptyExtract(),
    });
  }

  try {
    const extracted = await extractPolicyFromText(text);
    return NextResponse.json({
      filePath: path,
      fileName: file.name,
      scanned: false,
      extracted,
    });
  } catch {
    return NextResponse.json({
      filePath: path,
      fileName: file.name,
      scanned: false,
      message: "Could not auto-parse the document. Please review/enter fields manually.",
      extracted: emptyExtract(),
    });
  }
}

function emptyExtract() {
  return {
    client_name: null,
    client_email: null,
    client_phone: null,
    date_of_birth: null,
    age: null,
    company: null,
    policy_type: null,
    policy_number: null,
    sum_insured: null,
    premium: null,
    start_date: null,
    renewal_date: null,
    low_confidence_fields: [],
  };
}
