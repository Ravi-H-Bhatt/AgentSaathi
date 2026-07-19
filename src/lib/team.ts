import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent, Permissions } from "@/lib/types";
import { DEFAULT_PERMISSIONS } from "@/lib/types";
import { getWorkspace, type Workspace } from "@/lib/workspace";

/**
 * The agent whose data (clients/policies) the given user operates on.
 * Owners operate on their own data; colleagues operate on their parent's.
 */
export function ownerIdFor(agent: Agent): string {
  return agent.parent_agent_id || agent.id;
}

export function isColleague(agent: Agent): boolean {
  return !!agent.parent_agent_id;
}

/** Effective permissions — owners always have everything. */
export function permissionsFor(agent: Agent): Permissions {
  if (!agent.parent_agent_id)
    return { ai: true, clients: true, upload: true, email: true, delete: true };
  return { ...DEFAULT_PERMISSIONS, ...(agent.permissions || {}) };
}

/**
 * Record an action in the activity log (best-effort; never throws).
 * The row is tagged with the active workspace; pass it explicitly when known,
 * otherwise it's read from the request's workspace cookie.
 */
export async function logActivity(
  agent: Agent,
  action: string,
  detail?: string,
  workspace?: Workspace
): Promise<void> {
  try {
    const ws = workspace ?? (await getWorkspace());
    const db = createAdminClient();
    await db.from("activity_log").insert({
      agent_id: agent.id,
      owner_id: ownerIdFor(agent),
      action,
      detail: detail ?? null,
      workspace: ws,
    });
  } catch {
    // Logging must never break the request.
  }
}

/** Generate a URL-safe random invite token. */
export function makeInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
