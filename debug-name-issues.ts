import { readFileSync } from 'fs';
import { parseNewIndiaRegisterFast } from './src/lib/newindia-fast';
import { homedir } from 'os';
import { join } from 'path';

async function debugNameIssues() {
  const pdfPath = join(homedir(), 'Downloads', 'NEW MARCH26.pdf');
  const buffer = readFileSync(pdfPath);
  const policies = await parseNewIndiaRegisterFast(buffer);
  
  // Find the problematic records
  const problematic = policies.filter(p => 
    p.client_name && (
      p.client_name.includes('Line 1') ||
      p.client_name.includes('Line 2') ||
      p.client_name.includes('Line 3') ||
      p.client_name.includes('ORTHOPEDIC') ||
      p.client_name.includes('COMPANY LTD') ||
      p.client_name.includes('Insured Name') ||
      p.client_name.length > 50
    )
  );
  
  console.log(`\n🔍 Found ${problematic.length} problematic records:\n`);
  
  problematic.forEach((p, i) => {
    console.log(`${i + 1}. Policy: ${p.policy_number}`);
    console.log(`   Name: "${p.client_name}"`);
    console.log(`   Address: "${p.client_address}"`);
    console.log(`   Product: ${p.product_name}`);
    console.log(`   Type: ${p.policy_type}`);
    console.log();
  });
}

debugNameIssues().catch(console.error);
