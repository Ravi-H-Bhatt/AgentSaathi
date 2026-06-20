import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";

export const runtime = "nodejs";

interface Draft {
  id: string;
  agent_id: string;
  to_email: string;
  cc_email: string | null;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** GET /api/email/drafts - Load all drafts for current agent */
export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data } = await db
    .from("email_drafts")
    .select("*")
    .eq("agent_id", agent.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ drafts: (data as Draft[]) || [] });
}

/** POST /api/email/drafts - Save or update a draft */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, to_email, cc_email, subject, body } = await request.json();

  if (!to_email?.trim() || !subject?.trim()) {
    return NextResponse.json(
      { error: "To and Subject are required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Update existing draft
  if (id) {
    const { data, error } = await db
      .from("email_drafts")
      .update({
        to_email: to_email.trim(),
        cc_email: cc_email?.trim() || null,
        subject: subject.trim(),
        body: body?.trim() || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agent_id", agent.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ draft: data });
  }

  // Create new draft
  const { data, error } = await db
    .from("email_drafts")
    .insert({
      agent_id: agent.id,
      to_email: to_email.trim(),
      cc_email: cc_email?.trim() || null,
      subject: subject.trim(),
      body: body?.trim() || "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ draft: data });
}

/** DELETE /api/email/drafts?id=xxx - Delete a draft */
export async function DELETE(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db
    .from("email_drafts")
    .delete()
    .eq("id", id)
    .eq("agent_id", agent.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
