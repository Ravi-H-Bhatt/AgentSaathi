import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function debugPolicyTypes() {
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  const policies = await parseERegister(buffer);
  
  const missing = policies.filter(p => !p.policy_type);
  
  console.log(`Missing policy types: ${missing.length}/${policies.length}\n`);
  console.log('📋 First 10 records WITHOUT policy type:\n');
  
  missing.slice(0, 10).forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name}`);
    console.log(`   Ins.Co: ${p.product_name}`);
    console.log(`   Policy#: ${p.policy_number || '(none)'}`);
    console.log(`   Type: ${p.policy_type || 'MISSING'}`);
    console.log();
  });
  
  // Now check the PDF directly for one of these
  console.log('🔍 Checking raw PDF data for first missing record...\n');
  
  const { getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  // Find the first missing record's client name in the PDF
  const targetName = missing[0].client_name;
  console.log(`Looking for: "${targetName}"\n`);
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    
    let found = false;
    let targetY = 0;
    
    text.items.forEach((item: any) => {
      if (item.str.trim().includes(targetName?.split(' ')[0] || '')) {
        found = true;
        targetY = Math.round(item.transform[5]);
      }
    });
    
    if (found && targetY > 0) {
      console.log(`Found on page ${pageNum} at y=${targetY}`);
      console.log('\nAll items on that row:\n');
      
      const rowItems = text.items
        .filter((item: any) => Math.abs(Math.round(item.transform[5]) - targetY) < 2)
        .map((item: any) => ({
          str: item.str.trim(),
          x: Math.round(item.transform[4])
        }))
        .filter((item: any) => item.str);
      
      rowItems.forEach((item: any) => {
        const col = item.x >= 283 && item.x < 410 ? ' ← POLICY TYPE COLUMN' : '';
        console.log(`   "${item.str}" @ x=${item.x}${col}`);
      });
      
      break;
    }
  }
}

debugPolicyTypes().catch(console.error);
