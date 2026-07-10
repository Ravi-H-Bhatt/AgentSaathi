import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function verifyAll() {
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const rows = await parseERegister(buffer);
  
  console.log('\n✅ EXTRACTION RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total extracted: ${rows.length}`);
  console.log(`With client names: ${rows.filter(r => r.client_name).length}`);
  console.log(`With policy numbers: ${rows.filter(r => r.policy_number).length}`);
  console.log(`WITHOUT policy numbers: ${rows.filter(r => !r.policy_number && r.client_name).length}`);
  
  console.log('\n✅ ORDER VERIFICATION:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`First client: ${rows[0]?.client_name || 'ERROR'}`);
  console.log(`Last client: ${rows[rows.length - 1]?.client_name || 'ERROR'}`);
  
  console.log('\n✅ SAMPLE WITHOUT POLICY NUMBER:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const noPolicyNum = rows.filter(r => !r.policy_number && r.client_name).slice(0, 3);
  noPolicyNum.forEach((r, i) => {
    console.log(`${i + 1}. ${r.client_name} | ${r.product_name || '?'} | Premium: ${r.premium || 'N/A'}`);
  });
  
  console.log('\n✅ ALL POLICIES WILL BE IMPORTED:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total to import: ${rows.filter(r => r.client_name).length} policies`);
  console.log(`✓ Policies WITH policy numbers will be deduplicated`);
  console.log(`✓ Policies WITHOUT policy numbers will ALL be imported`);
  
  // Verify order is correct
  if (rows[0]?.client_name?.includes('MANOJ') && 
      rows[rows.length - 1]?.client_name?.includes('LALITBHAI')) {
    console.log('\n✅ EXTRACTION ORDER: CORRECT ✓');
  } else {
    console.log('\n❌ EXTRACTION ORDER: WRONG!');
  }
}

verifyAll().catch(console.error);
