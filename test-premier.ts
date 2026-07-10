import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function testPremier() {
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  const policies = await parseERegister(buffer);
  
  const premier = policies.find(p => p.client_name?.includes('PREMIER SYNTHETICS'));
  
  if (premier) {
    console.log('Found PREMIER SYNTHETICS:');
    console.log(JSON.stringify(premier, null, 2));
  } else {
    console.log('NOT FOUND');
  }
}

testPremier().catch(console.error);
