import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function verifyExtraction() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example_compressed.pdf');
  const buffer = readFileSync(pdfPath);
  
  // Count actual PZ IDs in PDF
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  let totalPZIds = 0;
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    
    text.items.forEach((item: any) => {
      const str = item.str.trim();
      const x = Math.round(item.transform[4]);
      if (/^PZ\d{8}$/.test(str) && x >= 28 && x <= 36) {
        totalPZIds++;
      }
    });
  }
  
  console.log(`📄 Total PZ IDs in PDF: ${totalPZIds}`);
  
  // Extract with our parser
  const policies = await parseERegister(buffer);
  console.log(`📊 Extracted policies: ${policies.length}`);
  console.log(`❌ Missing: ${totalPZIds - policies.length} rows\n`);
  
  // Check first row in PDF vs extracted
  console.log('🔍 Checking first row in PDF:');
  const page1 = await doc.getPage(1);
  const text1 = await page1.getTextContent();
  
  // Find first PZ ID
  let firstY = 0;
  text1.items.forEach((item: any) => {
    const str = item.str.trim();
    const x = Math.round(item.transform[4]);
    const y = Math.round(item.transform[5]);
    if (/^PZ\d{8}$/.test(str) && x >= 28 && x <= 36 && firstY === 0) {
      firstY = y;
      console.log(`First Tra ID: ${str} at y=${y}`);
    }
  });
  
  // Get all items from first row
  const firstRow = text1.items
    .filter((item: any) => Math.abs(Math.round(item.transform[5]) - firstY) < 2)
    .map((item: any) => ({
      str: item.str.trim(),
      x: Math.round(item.transform[4])
    }))
    .filter((item: any) => item.str);
  
  console.log('\nFirst row from PDF:');
  firstRow.forEach((item: any) => {
    let label = '';
    if (item.x >= 32 && item.x < 96) label = 'TraID';
    if (item.x >= 103 && item.x < 163) label = 'ApplDate';
    if (item.x >= 163 && item.x < 240) label = 'InsCo';
    if (item.x >= 240 && item.x < 490) label = 'PolicyType';
    if (item.x >= 490 && item.x < 622) label = 'ClientName';
    if (item.x >= 1309 && item.x < 1369) label = 'FromDate';
    if (item.x >= 1375 && item.x < 1435) label = 'ToDate';
    if (item.x >= 1757 && item.x < 1808) label = 'Premium';
    console.log(`   [${label.padEnd(12)}] "${item.str}" @ x=${item.x}`);
  });
  
  console.log('\nFirst policy extracted by parser:');
  const first = policies[0];
  console.log(`   Client: ${first.client_name}`);
  console.log(`   Ins.Co: ${first.product_name}`);
  console.log(`   Type: ${first.policy_type}`);
  console.log(`   Policy#: ${first.policy_number}`);
  console.log(`   Dates: ${first.start_date} → ${first.renewal_date}`);
  console.log(`   Premium: ₹${first.premium}`);
  
  console.log('\n' + '='.repeat(100));
  console.log('Do they match? Check manually above.');
}

verifyExtraction().catch(console.error);
