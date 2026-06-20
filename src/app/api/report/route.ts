import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor } from "@/lib/team";

export const runtime = "nodejs";

/** POST /api/report — an agent or colleague reports an error/issue. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, page } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Please describe the issue." }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("error_reports").insert({
    reporter_id: agent.id,
    reporter_name: agent.full_name || agent.email,
    reporter_email: agent.email,
    owner_id: ownerIdFor(agent),
    message: message.trim().slice(0, 2000),
    page: page?.toString().slice(0, 200) || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
