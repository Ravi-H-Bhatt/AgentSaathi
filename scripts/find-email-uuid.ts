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
  const email = process.argv[2] || 'harshalbhatt78@gmail.com';
  
  console.log(`\n🔍 Searching for: ${email}\n`);

  // Search in agents table
  const { data: agents } = await supabase
    .from('agents')
    .select('id, email, full_name')
    .eq('email', email);

  if (agents && agents.length > 0) {
    console.log('📧 Found in agents table:');
    agents.forEach(a => {
      console.log(`   UUID: ${a.id}`);
      console.log(`   Email: ${a.email}`);
      console.log(`   Name: ${a.full_name || 'N/A'}\n`);
    });
  }

  // Search in clients table by email
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email, phone, agent_id')
    .eq('email', email);

  if (clients && clients.length > 0) {
    console.log('👤 Found in clients table:');
    clients.forEach(c => {
      console.log(`   UUID: ${c.id}`);
      console.log(`   Name: ${c.full_name}`);
      console.log(`   Email: ${c.email}`);
      console.log(`   Phone: ${c.phone || 'N/A'}`);
      console.log(`   Agent ID: ${c.agent_id}\n`);
    });
  }

  if ((!agents || agents.length === 0) && (!clients || clients.length === 0)) {
    console.log(`❌ No records found for ${email}\n`);
  }
}

main().catch(console.error);
