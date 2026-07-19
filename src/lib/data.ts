import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Workspace } from "@/lib/workspace";
import type {
  Client,
  Policy,
  PremiumChart,
  ClientWithPolicies,
  Agent,
  Invitation,
  TimeEntry,
  ActivityLog,
} from "@/lib/types";

/**
 * Fetch ALL rows from a table for an agent, paginating past Supabase's
 * default 1,000-row cap. Without this, dashboards/lists silently top out
 * at 1,000 records no matter how many exist.
 */
async function fetchAllRows<T>(
  build: (
    db: ReturnType<typeof createAdminClient>,
    from: number,
    to: number
  ) => PromiseLike<{ data: unknown }>
): Promise<T[]> {
  const db = createAdminClient();
  const pageSize = 1000;
  let from = 0;
  const all: T[] = [];
  for (;;) {
    const { data } = await build(db, from, from + pageSize - 1);
    const batch = (data as T[]) || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/** All clients for an agent in a workspace, alphabetized. */
export async function getClients(
  agentId: string,
  workspace: Workspace
): Promise<Client[]> {
  return fetchAllRows<Client>((db, from, to) =>
    db
      .from("clients")
      .select("*")
      .eq("agent_id", agentId)
      .eq("workspace", workspace)
      .order("full_name", { ascending: true })
      .range(from, to)
  );
}

/** All policies for an agent in a workspace. */
export async function getPolicies(
  agentId: string,
  workspace: Workspace
): Promise<Policy[]> {
  return fetchAllRows<Policy>((db, from, to) =>
    db
      .from("policies")
      .select("*")
      .eq("agent_id", agentId)
      .eq("workspace", workspace)
      .order("renewal_date", { ascending: true })
      .range(from, to)
  );
}

/** A single client with all their policies (ownership + workspace enforced). */
export async function getClientWithPolicies(
  agentId: string,
  clientId: string,
  workspace: Workspace
): Promise<ClientWithPolicies | null> {
  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("agent_id", agentId)
    .eq("workspace", workspace)
    .maybeSingle();
  if (!client) return null;

  const { data: policies } = await db
    .from("policies")
    .select("*")
    .eq("client_id", clientId)
    .eq("agent_id", agentId)
    .eq("workspace", workspace)
    .order("renewal_date", { ascending: true });

  return { ...(client as Client), policies: (policies as Policy[]) || [] };
}

/** Every client of an agent in a workspace, each with all their policies. */
export async function getAllClientsWithPolicies(
  agentId: string,
  workspace: Workspace
): Promise<ClientWithPolicies[]> {
  // Fetch ALL clients and ALL policies (paginated past the 1,000-row cap).
  const [clients, policies] = await Promise.all([
    getClients(agentId, workspace),
    getPolicies(agentId, workspace),
  ]);

  const byClient = new Map<string, Policy[]>();
  for (const p of policies) {
    const arr = byClient.get(p.client_id) || [];
    arr.push(p);
    byClient.set(p.client_id, arr);
  }

  return clients.map((c) => ({
    ...c,
    policies: byClient.get(c.id) || [],
  }));
}

export async function getPremiumCharts(): Promise<PremiumChart[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("premium_charts")
    .select("*")
    .order("policy_type", { ascending: true })
    .order("age_min", { ascending: true });
  return (data as PremiumChart[]) || [];
}

/** Colleagues linked to an owner agent. */
export async function getColleagues(ownerId: string): Promise<Agent[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("agents")
    .select("*")
    .eq("parent_agent_id", ownerId)
    .order("created_at", { ascending: true });
  return ((data as Agent[]) || []).map((a) => ({
    ...a,
    permissions: a.permissions || {
      ai: true,
      clients: true,
      upload: true,
      email: true,
    },
  }));
}

/** Pending/active invitations created by an owner agent. */
export async function getInvitations(ownerId: string): Promise<Invitation[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("invitations")
    .select("*")
    .eq("agent_id", ownerId)
    .order("created_at", { ascending: false });
  return (data as Invitation[]) || [];
}

/** Recent time entries for an owner's whole team. */
export async function getTeamTimeEntries(
  ownerId: string,
  limit = 100
): Promise<TimeEntry[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("time_entries")
    .select("*")
    .eq("owner_id", ownerId)
    .order("clock_in", { ascending: false })
    .limit(limit);
  return (data as TimeEntry[]) || [];
}

/** Recent activity for an owner's whole team. */
export async function getTeamActivity(
  ownerId: string,
  limit = 100
): Promise<ActivityLog[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("activity_log")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ActivityLog[]) || [];
}

/** The current open (not clocked-out) time entry for a user, if any. */
export async function getOpenTimeEntry(
  agentId: string
): Promise<TimeEntry | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("time_entries")
    .select("*")
    .eq("agent_id", agentId)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .maybeSingle();
  return (data as TimeEntry) || null;
}
