import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";

export const runtime = "nodejs";

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  role: "agent" | "colleague";
  /** For colleagues: the owner agent they belong to. */
  ownerName: string | null;
}

/**
 * GET /api/admin/recipients — approved agents & colleagues (with emails) that
 * the admin can email. Admin-only.
 */
export async function GET() {
  const admin = await getCurrentAgent();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data } = await db
    .from("agents")
    .select("id, full_name, email, role, parent_agent_id")
    .eq("status", "approved")
    .in("role", ["agent", "colleague"]);

  type Row = {
    id: string;
    full_name: string | null;
    email: string;
    role: "agent" | "colleague";
    parent_agent_id: string | null;
  };
  const rows = (data as Row[]) || [];

  // Map owner id -> display name so colleagues can show who they belong to.
  const nameById = new Map<string, string>();
  for (const r of rows) nameById.set(r.id, r.full_name || r.email);

  const recipients: EmailRecipient[] = rows
    .filter((r) => !!r.email)
    .map((r) => ({
      id: r.id,
      name: r.full_name || r.email,
      email: r.email,
      role: r.role,
      ownerName:
        r.role === "colleague" && r.parent_agent_id
          ? nameById.get(r.parent_agent_id) || null
          : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ recipients });
}
