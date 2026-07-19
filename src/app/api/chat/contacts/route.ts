import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor } from "@/lib/team";

export const runtime = "nodejs";

export interface ChatContact {
  id: string;
  name: string;
  role: string;
}

/**
 * GET /api/chat/contacts — people the current user can direct-message.
 *  - Admin: everyone approved.
 *  - Agent/colleague: their own team (owner + colleagues) plus any admins.
 */
export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();

  const { data: all } = await db
    .from("agents")
    .select("id, full_name, email, role, parent_agent_id")
    .eq("status", "approved");

  type Row = {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    parent_agent_id: string | null;
  };
  const rows = (all as Row[]) || [];
  const ownerId = ownerIdFor(agent);

  const visible = rows.filter((r) => {
    if (r.id === agent.id) return false; // not myself
    if (agent.role === "admin") return true; // admin sees everyone
    // My team: the owner and its colleagues.
    const sameTeam = r.id === ownerId || r.parent_agent_id === ownerId;
    return sameTeam || r.role === "admin";
  });

  const contacts: ChatContact[] = visible
    .map((r) => ({
      id: r.id,
      name: r.full_name || r.email,
      role: r.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ contacts });
}
