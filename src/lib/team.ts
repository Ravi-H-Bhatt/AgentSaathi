import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent, Permissions } from "@/lib/types";
import { DEFAULT_PERMISSIONS } from "@/lib/types";

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
  if (!agent.parent_agent_id) return { ai: true, clients: true, upload: true, email: true };
  return { ...DEFAULT_PERMISSIONS, ...(agent.permissions || {}) };
}

/** Record an action in the activity log (best-effort; never throws). */
export async function logActivity(
  agent: Agent,
  action: string,
  detail?: string
): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("activity_log").insert({
      agent_id: agent.id,
      owner_id: ownerIdFor(agent),
      action,
      detail: detail ?? null,
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
