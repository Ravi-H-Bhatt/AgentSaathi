"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { logActivity, makeInviteToken, ownerIdFor } from "@/lib/team";
import type { Permissions } from "@/lib/types";

/** Only an owner agent (not a colleague, not admin) manages colleagues. */
async function requireOwner() {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved" || agent.parent_agent_id) {
    throw new Error("Not authorized");
  }
  return agent;
}

export async function createInvitation(permissions: Permissions, email?: string) {
  const agent = await requireOwner();
  const db = createAdminClient();
  const token = makeInviteToken();
  const { error } = await db.from("invitations").insert({
    agent_id: agent.id,
    token,
    email: email?.trim() || null,
    permissions,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/colleagues");
  return { token };
}

export async function revokeInvitation(id: string) {
  const agent = await requireOwner();
  const db = createAdminClient();
  await db
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("agent_id", agent.id);
  revalidatePath("/colleagues");
}

export async function updateColleaguePermissions(
  colleagueId: string,
  permissions: Permissions
) {
  const agent = await requireOwner();
  const db = createAdminClient();
  await db
    .from("agents")
    .update({ permissions })
    .eq("id", colleagueId)
    .eq("parent_agent_id", agent.id);
  revalidatePath("/colleagues");
}

export async function removeColleague(colleagueId: string) {
  const agent = await requireOwner();
  const db = createAdminClient();
  // Detaching: delete the colleague agent row (their auth user remains).
  await db
    .from("agents")
    .delete()
    .eq("id", colleagueId)
    .eq("parent_agent_id", agent.id);
  revalidatePath("/colleagues");
}

/** Clock in/out for the current user (colleague or owner). */
export async function clockIn() {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") throw new Error("Not authorized");
  const db = createAdminClient();

  // Avoid double clock-in: close any open entry check.
  const { data: open } = await db
    .from("time_entries")
    .select("id")
    .eq("agent_id", agent.id)
    .is("clock_out", null)
    .maybeSingle();
  if (open) return;

  await db.from("time_entries").insert({
    agent_id: agent.id,
    owner_id: ownerIdFor(agent),
  });
  await logActivity(agent, "clock_in", "Clocked in");
  revalidatePath("/colleagues");
}

export async function clockOut() {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") throw new Error("Not authorized");
  const db = createAdminClient();
  const { data: open } = await db
    .from("time_entries")
    .select("id")
    .eq("agent_id", agent.id)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .maybeSingle();
  if (!open) return;

  await db
    .from("time_entries")
    .update({ clock_out: new Date().toISOString() })
    .eq("id", open.id);
  await logActivity(agent, "clock_out", "Clocked out");
  revalidatePath("/colleagues");
}
