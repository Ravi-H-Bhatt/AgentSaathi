import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  const AGENT_EMAIL = 'harshalbhatt78@gmail.com';
  
  console.log(`\n🔍 Finding agent: ${AGENT_EMAIL}\n`);

  // Find the agent
  const { data: agents } = await supabase
    .from('agents')
    .select('id, email, full_name')
    .eq('email', AGENT_EMAIL);

  if (!agents || agents.length === 0) {
    console.error(`❌ Agent not found: ${AGENT_EMAIL}`);
    process.exit(1);
  }

  const agent = agents[0];
  console.log(`✅ Found agent:`);
  console.log(`   UUID: ${agent.id}`);
  console.log(`   Email: ${agent.email}`);
  console.log(`   Name: ${agent.full_name}\n`);

  // Get all policies without an agent assignment
  console.log(`📋 Fetching policies to assign...\n`);
  
  const { data: policies, error: fetchError } = await supabase
    .from('policies')
    .select('id, policy_number, policy_type')
    .is('agent_id', null)
    .limit(100);

  if (fetchError) {
    console.error('❌ Error fetching policies:', fetchError);
    process.exit(1);
  }

  if (!policies || policies.length === 0) {
    console.log(`ℹ️  No unassigned policies found`);
    console.log(`   All policies may already be assigned\n`);
    
    // Check for existing policies
    const { data: existing } = await supabase
      .from('policies')
      .select('count')
      .eq('agent_id', agent.id);
    
    console.log(`📊 Agent currently has ${existing?.length || 0} policies assigned\n`);
    return;
  }

  console.log(`📊 Found ${policies.length} unassigned policies\n`);

  // Assign all unassigned policies to this agent
  console.log(`🔄 Assigning ${policies.length} policies to ${agent.full_name}...\n`);

  const { error: updateError } = await supabase
    .from('policies')
    .update({ agent_id: agent.id })
    .is('agent_id', null);

  if (updateError) {
    console.error('❌ Error assigning policies:', updateError);
    process.exit(1);
  }

  console.log(`✅ Successfully assigned ${policies.length} policies!\n`);

  // Verify
  const { data: verify } = await supabase
    .from('policies')
    .select('count')
    .eq('agent_id', agent.id);

  console.log(`📊 Verification: Agent now has policies assigned\n`);

  // Show sample
  const { data: samples } = await supabase
    .from('policies')
    .select('policy_number, policy_type, premium, renewal_date')
    .eq('agent_id', agent.id)
    .limit(5);

  if (samples && samples.length > 0) {
    console.log(`📋 Sample policies:`);
    samples.forEach(p => {
      console.log(`   - ${p.policy_number}`);
      console.log(`     Type: ${p.policy_type}`);
      console.log(`     Premium: ${p.premium}`);
      console.log(`     Renewal: ${p.renewal_date}\n`);
    });
  }
}

main().catch(console.error);
