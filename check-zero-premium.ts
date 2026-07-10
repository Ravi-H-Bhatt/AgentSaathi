import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function checkZero() {
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  const policies = await parseERegister(buffer);
  
  // Find the one with null/undefined premium (not 0)
  const missingPremium = policies.filter(p => p.premium === null || p.premium === undefined);
  
  console.log(`Records with NULL premium: ${missingPremium.length}\n`);
  missingPremium.forEach(p => {
    console.log(`- ${p.client_name} | ${p.policy_type} | ${p.start_date}`);
  });
  
  // Also check records with 0 premium
  const zeroPremium = policies.filter(p => p.premium === 0);
  console.log(`\nRecords with ZERO premium: ${zeroPremium.length}\n`);
  zeroPremium.slice(0, 5).forEach(p => {
    console.log(`- ${p.client_name} | ${p.policy_type} | Premium: ${p.premium}`);
  });
}

checkZero().catch(console.error);
