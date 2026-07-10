import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function debugMissingFields() {
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  const policies = await parseERegister(buffer);
  
  const missingInsCo = policies.filter(p => !p.product_name);
  const missingPremium = policies.filter(p => !p.premium);
  
  console.log(`Missing Insurance Co: ${missingInsCo.length}/787\n`);
  console.log('📋 Records WITHOUT Insurance Co:\n');
  missingInsCo.forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name} | Policy#: ${p.policy_number || '(none)'}`);
    console.log(`   Ins.Co: "${p.product_name}" | Type: ${p.policy_type}`);
  });
  
  console.log(`\n\nMissing Premium: ${missingPremium.length}/787\n`);
  console.log('📋 Records WITHOUT Premium:\n');
  missingPremium.forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name} | Policy#: ${p.policy_number || '(none)'}`);
    console.log(`   Ins.Co: ${p.product_name} | Premium: ${p.premium}`);
  });
  
  // Check raw PDF for one missing insurance co
  if (missingInsCo.length > 0) {
    const { getDocumentProxy } = await import('unpdf');
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    
    const targetName = missingInsCo[0].client_name;
    console.log(`\n\n🔍 Checking PDF for: "${targetName}"\n`);
    
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
        console.log(`Found on page ${pageNum} at y=${targetY}\n`);
        const rowItems = text.items
          .filter((item: any) => Math.abs(Math.round(item.transform[5]) - targetY) < 2)
          .map((item: any) => ({
            str: item.str.trim(),
            x: Math.round(item.transform[4])
          }))
          .filter((item: any) => item.str);
        
        rowItems.forEach((item: any) => {
          let col = '';
          if (item.x >= 173 && item.x < 240) col = ' ← INS.CO COLUMN';
          if (item.x >= 240 && item.x < 490) col = ' ← POLICY TYPE';
          if (item.x >= 490 && item.x < 622) col = ' ← CLIENT NAME';
          console.log(`   "${item.str}" @ x=${item.x}${col}`);
        });
        break;
      }
    }
  }
}

debugMissingFields().catch(console.error);
