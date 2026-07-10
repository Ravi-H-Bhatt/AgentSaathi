import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugPremium() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  // Find "PREMIER SYNTHETICS"
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    
    let found = false;
    let targetY = 0;
    
    text.items.forEach((item: any) => {
      if (item.str.trim().includes('PREMIER SYNTHETICS')) {
        found = true;
        targetY = Math.round(item.transform[5]);
      }
    });
    
    if (found && targetY > 0) {
      console.log(`Found PREMIER SYNTHETICS on page ${pageNum} at y=${targetY}\n`);
      const rowItems = text.items
        .filter((item: any) => Math.abs(Math.round(item.transform[5]) - targetY) < 2)
        .map((item: any) => ({
          str: item.str.trim(),
          x: Math.round(item.transform[4])
        }))
        .filter((item: any) => item.str);
      
      rowItems.forEach((item: any) => {
        let col = '';
        if (item.x >= 1465 && item.x < 1515) col = ' ← BASIC';
        if (item.x >= 1757 && item.x < 1808) col = ' ← TOTAL PREMIUM';
        console.log(`   "${item.str}" @ x=${item.x}${col}`);
      });
      break;
    }
  }
}

debugPremium().catch(console.error);
