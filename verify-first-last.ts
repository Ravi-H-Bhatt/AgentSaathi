import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function verifyFirstLast() {
  const buffer = readFileSync(join(homedir(), 'Downloads', 'example.pdf'));
  const policies = await parseERegister(buffer);
  
  // Filter only rows with client names
  const validPolicies = policies.filter(p => p.client_name && p.client_name.trim());
  
  console.log(`Total extracted: ${policies.length}`);
  console.log(`With client names: ${validPolicies.length}`);
  console.log(`Empty/Invalid: ${policies.length - validPolicies.length}`);
  
  console.log('\n📋 FIRST 3 valid policies:');
  validPolicies.slice(0, 3).forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name}`);
    console.log(`   Ins.Co: ${p.product_name} | Type: ${p.policy_type}`);
    console.log(`   Premium: ₹${p.premium} | Dates: ${p.start_date} → ${p.renewal_date}`);
  });
  
  console.log('\n📋 LAST 3 valid policies:');
  validPolicies.slice(-3).forEach((p, i) => {
    console.log(`${validPolicies.length - 2 + i}. ${p.client_name}`);
    console.log(`   Ins.Co: ${p.product_name} | Type: ${p.policy_type}`);
    console.log(`   Premium: ₹${p.premium} | Dates: ${p.start_date} → ${p.renewal_date}`);
  });
  
  // Check for MANOJ MADHWANI and LALITBHAI PATEL
  const firstPolicy = validPolicies[0];
  const lastPolicy = validPolicies[validPolicies.length - 1];
  
  console.log('\n' + '='.repeat(100));
  console.log(`First client: ${firstPolicy.client_name}`);
  console.log(`Expected: MANOJ MADHWANI`);
  console.log(`Match: ${firstPolicy.client_name?.includes('MANOJ') ? '✅' : '❌'}`);
  
  console.log(`\nLast client: ${lastPolicy.client_name}`);
  console.log(`Expected: LALITBHAI PATEL`);
  console.log(`Match: ${lastPolicy.client_name?.includes('LALITBHAI') ? '✅' : '❌'}`);
  console.log('='.repeat(100));
}

verifyFirstLast().catch(console.error);
