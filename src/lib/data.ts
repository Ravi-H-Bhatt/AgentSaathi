import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, Policy, PremiumChart, ClientWithPolicies } from "@/lib/types";

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

export async function getPremiumCharts(): Promise<PremiumChart[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("premium_charts")
    .select("*")
    .order("policy_type", { ascending: true })
    .order("age_min", { ascending: true });
  return (data as PremiumChart[]) || [];
}
