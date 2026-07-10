import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function checkEmptyRows() {
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const rows = await parseERegister(buffer);
  
  console.log('\n📊 EXTRACTION BREAKDOWN:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total extracted: ${rows.length}`);
  
  const withNames = rows.filter(r => r.client_name && r.client_name.trim());
  const withoutNames = rows.filter(r => !r.client_name || !r.client_name.trim());
  
  console.log(`✓ With client names: ${withNames.length}`);
  console.log(`✗ WITHOUT client names: ${withoutNames.length}`);
  
  if (withoutNames.length > 0) {
    console.log('\n❌ ROWS WITHOUT NAMES (should be filtered):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    withoutNames.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. Name: "${r.client_name}" | Product: ${r.product_name || 'N/A'} | Policy: ${r.policy_number || 'N/A'}`);
    });
  }
  
  console.log('\n✅ EXPECTED RESULT: 787 policies (all with names)');
  console.log(`📦 ACTUAL RESULT: ${withNames.length} policies with names`);
  
  if (withoutNames.length > 0) {
    console.log(`\n⚠️  ISSUE: ${withoutNames.length} rows extracted without client names!`);
    console.log('These should have been filtered out in the parser.');
  }
}

checkEmptyRows().catch(console.error);
