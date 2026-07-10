import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function findManoj() {
  const pdfPath = join(homedir(), 'Downloads', 'example_compressed.pdf');
  const buffer = readFileSync(pdfPath);
  const policies = await parseERegister(buffer);
  
  // Find MANOJ MADHWANI
  const manoj = policies.filter(p => p.client_name?.includes('MANOJ'));
  
  console.log(`Found ${manoj.length} policies with "MANOJ" in name:\n`);
  manoj.forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name}`);
    console.log(`   Policy: ${p.policy_number || '(none)'}`);
    console.log(`   Ins.Co: ${p.product_name}`);
    console.log(`   Type: ${p.policy_type}`);
    console.log(`   Premium: ₹${p.premium}`);
    console.log(`   Dates: ${p.start_date} → ${p.renewal_date}`);
    console.log();
  });
  
  // Also check for D229524195 (the policy number from first row)
  const policy = policies.find(p => p.policy_number === 'D229524195');
  if (policy) {
    console.log('Found policy D229524195:');
    console.log(JSON.stringify(policy, null, 2));
  } else {
    console.log('❌ Policy D229524195 NOT FOUND in extraction');
  }
}

findManoj().catch(console.error);
