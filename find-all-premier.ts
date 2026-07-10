import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function findAllPremier() {
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  const policies = await parseERegister(buffer);
  
  const premiers = policies.filter(p => p.client_name?.includes('PREMIER'));
  
  console.log(`Found ${premiers.length} PREMIER records:\n`);
  premiers.forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name}`);
    console.log(`   Premium: ${p.premium || '(MISSING)'} | Type: ${p.policy_type}`);
    console.log(`   Dates: ${p.start_date} → ${p.renewal_date}`);
    console.log();
  });
}

findAllPremier().catch(console.error);
