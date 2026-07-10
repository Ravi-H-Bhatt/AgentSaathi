import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function testCompressed() {
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  
  const pdfPath = join(homedir(), 'Downloads', 'example_compressed.pdf');
  const buffer = readFileSync(pdfPath);
  
  const rows = await parseERegister(buffer);
  
  console.log('\n✅ Total extracted:', rows.length);
  console.log('✅ With names:', rows.filter(r => r.client_name).length);
  console.log('\n📋 First 5 records:');
  rows.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. ${r.client_name || '(no name)'} | ${r.product_name || '?'} | ${r.policy_number || 'no policy#'}`);
  });
  
  console.log('\n📋 Last 5 records:');
  rows.slice(-5).forEach((r, i) => {
    console.log(`${rows.length - 4 + i}. ${r.client_name || '(no name)'} | ${r.product_name || '?'} | ${r.policy_number || 'no policy#'}`);
  });
}

testCompressed().catch(console.error);
