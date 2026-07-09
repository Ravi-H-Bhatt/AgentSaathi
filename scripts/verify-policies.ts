import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const AGENT_ID = '725ea534-0894-47e8-bede-5ea16cefa981';
const CLIENT_ID = 'e201a144-74e6-4fe5-8a15-63bff80f1898';

async function main() {
  console.log('\n🔍 Verifying inserted policies...\n');

  // Check if policies exist
  const { data: policies, error } = await supabase
    .from('policies')
    .select('*')
    .eq('agent_id', AGENT_ID);

  if (error) {
    console.error('❌ Error fetching policies:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${policies?.length || 0} total policies for agent ${AGENT_ID}\n`);

  if (!policies || policies.length === 0) {
    console.log('❌ No policies found! The insertion may have failed.');
    process.exit(1);
  }

  // Show breakdown
  const byClient: Record<string, number> = {};
  policies.forEach(p => {
    const client = p.client_id;
    byClient[client] = (byClient[client] || 0) + 1;
  });

  console.log('📋 Policies by client:');
  Object.entries(byClient).forEach(([clientId, count]) => {
    console.log(`   Client ${clientId}: ${count} policies`);
  });

  // Show sample policies
  console.log('\n📊 Sample policies:');
  policies.slice(0, 5).forEach(p => {
    console.log(`   - ${p.policy_number} (${p.policy_type})`);
    console.log(`     Renewal: ${p.renewal_date}`);
    console.log(`     Premium: ${p.premium}`);
  });

  // Check if client exists
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', CLIENT_ID)
    .single();

  if (client) {
    console.log(`\n✅ Client exists: ${client.full_name}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Phone: ${client.phone}`);
  } else {
    console.log(`\n❌ Client not found!`);
  }
}

main().catch(console.error);
