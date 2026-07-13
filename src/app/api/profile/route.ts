import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";

export const runtime = "nodejs";

/** PUT /api/profile - Update current agent's profile */
export async function PUT(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const full_name = body.full_name;
  // Phone is optional. Normalize to a trimmed string, or null to clear it.
  const hasPhone = Object.prototype.hasOwnProperty.call(body, "phone");
  const phone =
    typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;

  if (!full_name?.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const update: { full_name: string; phone?: string | null } = {
    full_name: full_name.trim(),
  };
  if (hasPhone) update.phone = phone;

  const db = createAdminClient();
  let { data, error } = await db
    .from("agents")
    .update(update)
    .eq("id", agent.id)
    .select()
    .single();

  // Gracefully handle the case where the phone column hasn't been added yet.
  if (error && /phone/i.test(error.message) && /column/i.test(error.message)) {
    ({ data, error } = await db
      .from("agents")
      .update({ full_name: full_name.trim() })
      .eq("id", agent.id)
      .select()
      .single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agent: data });
}
