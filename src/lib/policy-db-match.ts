/**
 * Policy Database Matching & Attachment
 * 
 * Matches extracted policies with existing database records and auto-attaches
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface MatchResult {
  matched: boolean;
  client_id?: string;
  policy_id?: string;
  match_type: 'exact_policy' | 'renewal_via_previous' | 'client_name' | 'none';
  confidence: number; // 0-1
  message: string;
}

/**
 * MATCH STRATEGY 1: Exact policy number match
 * Most reliable - direct match on current policy number
 */
async function matchByPolicyNumber(
  policyNumber: string,
  agentId: string
): Promise<MatchResult | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from('policies')
    .select('id, client_id')
    .eq('agent_id', agentId)
    .eq('policy_number', policyNumber)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    matched: true,
    client_id: data.client_id,
    policy_id: data.id,
    match_type: 'exact_policy',
    confidence: 1.0,
    message: `Exact match on policy number: ${policyNumber}`,
  };
}

/**
 * MATCH STRATEGY 2: Previous policy number (renewal detection)
 * Good confidence - finds the previous policy and updates with new number
 */
async function matchByPreviousPolicy(
  previousPolicyNumber: string,
  agentId: string
): Promise<MatchResult | null> {
  if (!previousPolicyNumber) {
    return null;
  }

  const db = createAdminClient();

  const { data, error } = await db
    .from('policies')
    .select('id, client_id')
    .eq('agent_id', agentId)
    .eq('policy_number', previousPolicyNumber)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    matched: true,
    client_id: data.client_id,
    policy_id: data.id,
    match_type: 'renewal_via_previous',
    confidence: 0.95,
    message: `Renewal detected: Previous policy ${previousPolicyNumber} found (new policy will be attached)`,
  };
}

/**
 * MATCH STRATEGY 3: Client name match
 * Lower confidence - matches client by name
 */
async function matchByClientName(
  clientName: string,
  agentId: string,
  company: string
): Promise<MatchResult | null> {
  const db = createAdminClient();

  // Fuzzy search on client name
  const { data: clients, error } = await db
    .from('clients')
    .select('id, full_name')
    .eq('agent_id', agentId)
    .ilike('full_name', `%${clientName}%`)
    .limit(1);

  if (error || !clients || clients.length === 0) {
    return null;
  }

  const client = clients[0];

  // Check if client has any policies from same company
  const { data: policies } = await db
    .from('policies')
    .select('id')
    .eq('client_id', client.id)
    .eq('company', company)
    .limit(1);

  if (!policies || policies.length === 0) {
    return null;
  }

  return {
    matched: true,
    client_id: client.id,
    match_type: 'client_name',
    confidence: 0.75,
    message: `Client name match: ${client.full_name}`,
  };
}

/**
 * Main matching function - tries all strategies in order
 */
export async function matchPolicyInDatabase(
  extraction: {
    policy_number: string;
    previous_policy_number?: string | null;
    client_name: string;
    company: string;
  },
  agentId: string
): Promise<MatchResult> {
  try {
    // Strategy 1: Exact policy number
    const exactMatch = await matchByPolicyNumber(extraction.policy_number, agentId);
    if (exactMatch) {
      return exactMatch;
    }

    // Strategy 2: Previous policy (renewal)
    if (extraction.previous_policy_number) {
      const renewalMatch = await matchByPreviousPolicy(
        extraction.previous_policy_number,
        agentId
      );
      if (renewalMatch) {
        return renewalMatch;
      }
    }

    // Strategy 3: Client name
    const clientMatch = await matchByClientName(
      extraction.client_name,
      agentId,
      extraction.company
    );
    if (clientMatch) {
      return clientMatch;
    }

    // No match found
    return {
      matched: false,
      match_type: 'none',
      confidence: 0,
      message: 'No matching policy or client found in database',
    };
  } catch (error) {
    console.error('Database matching error:', error);
    return {
      matched: false,
      match_type: 'none',
      confidence: 0,
      message: `Error during matching: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Attach or create policy in database
 */
export async function attachPolicyToClient(
  extraction: {
    client_name: string;
    policy_number: string;
    previous_policy_number?: string | null;
    company: string;
    product_name: string;
    policy_type: string;
    sum_insured: number;
    premium: number;
    start_date: string;
    renewal_date: string;
    client_address?: string | null;
    policy_holder_type?: string | null;
  },
  agentId: string,
  sourceFilePath: string
): Promise<{
  success: boolean;
  client_id?: string;
  policy_id?: string;
  message: string;
  isNewClient?: boolean;
  isNewPolicy?: boolean;
}> {
  const db = createAdminClient();

  try {
    // First, try to match with existing policy
    const match = await matchPolicyInDatabase(extraction, agentId);

    if (match.matched && match.client_id) {
      // Update or create policy
      if (match.policy_id) {
        // Update existing policy
        const { error: updateError } = await db
          .from('policies')
          .update({
            policy_number: extraction.policy_number,
            sum_insured: extraction.sum_insured,
            premium: extraction.premium,
            start_date: extraction.start_date,
            renewal_date: extraction.renewal_date,
            source_file_path: sourceFilePath,
          })
          .eq('id', match.policy_id);

        if (updateError) {
          return {
            success: false,
            message: `Failed to update policy: ${updateError.message}`,
          };
        }

        return {
          success: true,
          client_id: match.client_id,
          policy_id: match.policy_id,
          message: `✅ ${match.message} - Policy UPDATED`,
          isNewPolicy: false,
        };
      } else {
        // Create new policy for existing client
        const { data: newPolicy, error: createError } = await db
          .from('policies')
          .insert({
            agent_id: agentId,
            client_id: match.client_id,
            company: extraction.company,
            product_name: extraction.product_name,
            policy_type: extraction.policy_type,
            policy_number: extraction.policy_number,
            sum_insured: extraction.sum_insured,
            premium: extraction.premium,
            start_date: extraction.start_date,
            renewal_date: extraction.renewal_date,
            client_address: extraction.client_address,
            policy_holder_type: extraction.policy_holder_type,
            source_file_path: sourceFilePath,
          })
          .select()
          .single();

        if (createError) {
          return {
            success: false,
            message: `Failed to create policy: ${createError.message}`,
          };
        }

        return {
          success: true,
          client_id: match.client_id,
          policy_id: newPolicy?.id,
          message: `✅ ${match.message} - Policy CREATED`,
          isNewPolicy: true,
        };
      }
    }

    // No match found - create new client and policy
    // First, create client
    const { data: newClient, error: clientError } = await db
      .from('clients')
      .insert({
        agent_id: agentId,
        full_name: extraction.client_name,
        phone: null,
        email: null,
      })
      .select()
      .single();

    if (clientError || !newClient) {
      return {
        success: false,
        message: `Failed to create client: ${clientError?.message || 'Unknown error'}`,
      };
    }

    // Then create policy
    const { data: newPolicy, error: policyError } = await db
      .from('policies')
      .insert({
        agent_id: agentId,
        client_id: newClient.id,
        company: extraction.company,
        product_name: extraction.product_name,
        policy_type: extraction.policy_type,
        policy_number: extraction.policy_number,
        sum_insured: extraction.sum_insured,
        premium: extraction.premium,
        start_date: extraction.start_date,
        renewal_date: extraction.renewal_date,
        client_address: extraction.client_address,
        policy_holder_type: extraction.policy_holder_type,
        source_file_path: sourceFilePath,
      })
      .select()
      .single();

    if (policyError || !newPolicy) {
      return {
        success: false,
        message: `Failed to create policy: ${policyError?.message || 'Unknown error'}`,
      };
    }

    return {
      success: true,
      client_id: newClient.id,
      policy_id: newPolicy.id,
      message: `✅ NEW CLIENT & POLICY CREATED - ${extraction.client_name}`,
      isNewClient: true,
      isNewPolicy: true,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error attaching policy: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
