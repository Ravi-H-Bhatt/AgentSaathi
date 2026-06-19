import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
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

/** All clients for an agent, alphabetized. */
export async function getClients(agentId: string): Promise<Client[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("clients")
    .select("*")
    .eq("agent_id", agentId)
    .order("full_name", { ascending: true });
  return (data as Client[]) || [];
}

/** All policies for an agent. */
export async function getPolicies(agentId: string): Promise<Policy[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("policies")
    .select("*")
    .eq("agent_id", agentId);
  return (data as Policy[]) || [];
}

/** A single client with all their policies (ownership enforced). */
export async function getClientWithPolicies(
  agentId: string,
  clientId: string
): Promise<ClientWithPolicies | null> {
  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("agent_id", agentId)
    .maybeSingle();
  if (!client) return null;

  const { data: policies } = await db
    .from("policies")
    .select("*")
    .eq("client_id", clientId)
    .eq("agent_id", agentId)
    .order("renewal_date", { ascending: true });

  return { ...(client as Client), policies: (policies as Policy[]) || [] };
}

/** Every client of an agent, each with all their policies (alphabetized). */
export async function getAllClientsWithPolicies(
  agentId: string
): Promise<ClientWithPolicies[]> {
  const db = createAdminClient();
  const [{ data: clients }, { data: policies }] = await Promise.all([
    db
      .from("clients")
      .select("*")
      .eq("agent_id", agentId)
      .order("full_name", { ascending: true }),
    db
      .from("policies")
      .select("*")
      .eq("agent_id", agentId)
      .order("renewal_date", { ascending: true }),
  ]);

  const byClient = new Map<string, Policy[]>();
  for (const p of (policies as Policy[]) || []) {
    const arr = byClient.get(p.client_id) || [];
    arr.push(p);
    byClient.set(p.client_id, arr);
  }

  return ((clients as Client[]) || []).map((c) => ({
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
