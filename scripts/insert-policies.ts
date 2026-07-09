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
const CLIENT_ID = 'e201a144-74e6-4fe5-8a15-63bff80f1898'; // The client under this agent

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
  console.log('\n📋 Inserting New India policies...\n');
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`Client ID: ${CLIENT_ID}`);
  console.log(`Total policies to insert: ${policies.length}\n`);

  const { data, error } = await supabase
    .from('policies')
    .insert(
      policies.map(p => ({
        agent_id: AGENT_ID,
        client_id: CLIENT_ID,
        company: 'New India Assurance',
        policy_number: p.policy_number,
        policy_type: p.policy_type,
        sum_insured: p.sum_insured,
        premium: p.premium,
        renewal_date: p.renewal_date,
        status: 'active'
      }))
    )
    .select();

  if (error) {
    console.error('❌ Error inserting policies:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${data?.length || policies.length} policies!\n`);
  
  // Show a summary
  const byType: Record<string, number> = {};
  policies.forEach(p => {
    byType[p.policy_type] = (byType[p.policy_type] || 0) + 1;
  });
  
  console.log('📊 Breakdown by policy type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  console.log('');
}

main().catch(console.error);
