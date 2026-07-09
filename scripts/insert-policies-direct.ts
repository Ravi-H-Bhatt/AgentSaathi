#!/usr/bin/env tsx
/**
 * Direct policy insert script
 * Inserts 26 policies into Supabase without needing the web dashboard
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get agent and client IDs from command line or environment
const agentId = process.argv[2];
const clientId = process.argv[3];

if (!agentId || !clientId) {
  console.error('❌ Missing arguments');
  console.error('   Usage: npx tsx scripts/insert-policies-direct.ts <agent-id> <client-id>');
  console.error('\n   Example:');
  console.error('   npx tsx scripts/insert-policies-direct.ts abc123de-5678-90ab-cdef-1234567890ab xyz789ab-cdef-1234-5678-90abcdef1234');
  console.error('\n   Get agent ID:');
  console.error('   npx tsx -e "import {createClient} from \'@supabase/supabase-js\'; const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); db.from(\'agents\').select(\'id,email\').then(r => console.log(r.data))"');
  process.exit(1);
}

const policies = [
  { policy_number: '21060046240100000100', policy_type: 'Burglary Insurance', sum_insured: 60000000, premium: 42000, renewal_date: '2025-07-05' },
  { policy_number: '21060046240100000105', policy_type: 'Burglary Insurance', sum_insured: 5000000, premium: 5000, renewal_date: '2025-07-08' },
  { policy_number: '21060048240600000172', policy_type: 'Shopkeepers Insurance', sum_insured: 1112000, premium: 1008, renewal_date: '2025-07-23' },
  { policy_number: '21060048240500000229', policy_type: 'Householders Insurance', sum_insured: 1900000, premium: 921, renewal_date: '2025-08-27' },
  { policy_number: '21060048240500000243', policy_type: 'Householders Insurance', sum_insured: 3071000, premium: 2510, renewal_date: '2025-09-08' },
  { policy_number: '21060048240600000240', policy_type: 'Shopkeepers Insurance', sum_insured: 5060000, premium: 5103, renewal_date: '2025-09-18' },
  { policy_number: '21060046240100000167', policy_type: 'Burglary Insurance', sum_insured: 20000000, premium: 20000, renewal_date: '2025-09-30' },
  { policy_number: '21060048240600000273', policy_type: 'Shopkeepers Insurance', sum_insured: 3930000, premium: 3876, renewal_date: '2025-10-16' },
  { policy_number: '21060048240600000274', policy_type: 'Shopkeepers Insurance', sum_insured: 7520001, premium: 6996, renewal_date: '2025-10-17' },
  { policy_number: '21060046240100000209', policy_type: 'Burglary Insurance', sum_insured: 500000, premium: 1000, renewal_date: '2025-11-16' },
  { policy_number: '21060048250600000003', policy_type: 'Shopkeepers Insurance', sum_insured: 20558000, premium: 19885, renewal_date: '2026-04-05' },
  { policy_number: '21060046250100000002', policy_type: 'Burglary Insurance', sum_insured: 30000000, premium: 33000, renewal_date: '2026-04-07' },
  { policy_number: '21060046250100000007', policy_type: 'Burglary Insurance', sum_insured: 35000000, premium: 25025, renewal_date: '2026-04-12' },
  { policy_number: '21060011254300000004', policy_type: 'New India Bharat Laghu Udyam Suraksha', sum_insured: 102000000, premium: 100725, renewal_date: '2026-05-01' },
  { policy_number: '21060011160100000470', policy_type: 'Standard Fire & Special Perils', sum_insured: 2500000, premium: 6500, renewal_date: '2026-05-10' },
  { policy_number: '21060011258000000260', policy_type: 'Bharat Sookshma Udyam Suraksha (Fire)', sum_insured: 25000000, premium: 29938, renewal_date: '2026-06-01' },
  { policy_number: '21060011258000000319', policy_type: 'Bharat Sookshma Udyam Suraksha (Fire)', sum_insured: 38000000, premium: 37852, renewal_date: '2026-06-10' },
  { policy_number: '21060011258000000386', policy_type: 'Bharat Sookshma Udyam Suraksha (Fire)', sum_insured: 10000000, premium: 12400, renewal_date: '2026-06-25' },
  { policy_number: '21060011258000000359', policy_type: 'Bharat Sookshma Udyam Suraksha (Fire)', sum_insured: 20000000, premium: 21430, renewal_date: '2026-06-26' },
  { policy_number: '21060046240100000208', policy_type: 'Burglary Insurance', sum_insured: 500000, premium: 1500, renewal_date: '2025-11-16' },
  { policy_number: '21060048240600000402', policy_type: 'Shopkeepers Insurance', sum_insured: 4343001, premium: 4317, renewal_date: '2026-02-17' },
  { policy_number: '21060046240100000280', policy_type: 'Burglary Insurance', sum_insured: 30000000, premium: 21000, renewal_date: '2026-02-24' },
  { policy_number: '21060046240100000283', policy_type: 'Burglary Insurance', sum_insured: 20000000, premium: 20000, renewal_date: '2026-02-25' },
  { policy_number: '21060046240100000308', policy_type: 'Burglary Insurance', sum_insured: 700000, premium: 1400, renewal_date: '2026-03-11' },
  { policy_number: '21060046240100000309', policy_type: 'Burglary Insurance', sum_insured: 1000000, premium: 3000, renewal_date: '2026-03-11' },
  { policy_number: '21060048240600000447', policy_type: 'Shopkeepers Insurance', sum_insured: 11570001, premium: 10941, renewal_date: '2026-03-26' },
];

async function main() {
  console.log('🚀 Starting direct policy insert...\n');
  console.log(`Agent ID: ${agentId}`);
  console.log(`Client ID: ${clientId}`);
  console.log(`Policies to insert: ${policies.length}\n`);

  // Verify agent exists
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, email')
    .eq('id', agentId);

  if (agentError || !agents || agents.length === 0) {
    console.error('❌ Agent not found:', agentError || 'No agents returned');
    process.exit(1);
  }

  console.log(`✓ Agent found: ${agents[0].email}\n`);

  // Verify client exists
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('id', clientId);

  if (clientError || !clients || clients.length === 0) {
    console.error('❌ Client not found:', clientError || 'No clients returned');
    process.exit(1);
  }

  console.log(`✓ Client found: ${clients[0].full_name}\n`);

  // Check for existing policies
  const existingNumbers = new Set<string>();
  for (const p of policies) {
    const { data: existing } = await supabase
      .from('policies')
      .select('policy_number')
      .eq('agent_id', agentId)
      .eq('policy_number', p.policy_number);

    if (existing && existing.length > 0) {
      existingNumbers.add(p.policy_number);
    }
  }

  if (existingNumbers.size > 0) {
    console.log(`⚠️  ${existingNumbers.size} policies already exist, skipping:`);
    for (const num of existingNumbers) {
      console.log(`   - ${num}`);
    }
    console.log();
  }

  // Prepare policies to insert
  const toInsert = policies
    .filter(p => !existingNumbers.has(p.policy_number))
    .map(p => ({
      agent_id: agentId,
      client_id: clientId,
      policy_number: p.policy_number,
      company: 'New India',
      policy_type: p.policy_type,
      sum_insured: p.sum_insured,
      premium: p.premium,
      renewal_date: p.renewal_date,
      status: 'active',
    }));

  if (toInsert.length === 0) {
    console.log('✓ All policies already exist in database');
    return;
  }

  console.log(`📥 Inserting ${toInsert.length} policies...\n`);

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { error } = await supabase
      .from('policies')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / 100) + 1}:`, error);
      continue;
    }

    inserted += batch.length;
    console.log(`✓ Batch ${Math.floor(i / 100) + 1}/${Math.ceil(toInsert.length / 100)} inserted (${batch.length} policies)`);
  }

  // Calculate totals
  const totalPremium = toInsert.reduce((sum, p) => sum + p.premium, 0);
  const totalSI = toInsert.reduce((sum, p) => sum + p.sum_insured, 0);

  console.log(`\n✨ Insert complete!`);
  console.log(`   ${inserted} policies added`);
  console.log(`   Total premium: ₹${totalPremium.toLocaleString('en-IN')}`);
  console.log(`   Total sum insured: ₹${totalSI.toLocaleString('en-IN')}`);

  // Verify
  const { count } = await supabase
    .from('policies')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId);

  console.log(`\n   Total policies for agent: ${count}`);
  console.log('\n🎉 All done! Refresh your dashboard to see the updates.\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
