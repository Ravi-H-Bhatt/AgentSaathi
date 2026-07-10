import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugDigit() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  // Find "D178012621" (first missing Digit policy)
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    
    let found = false;
    let targetY = 0;
    
    text.items.forEach((item: any) => {
      if (item.str.trim() === 'D178012621') {
        found = true;
        targetY = Math.round(item.transform[5]);
      }
    });
    
    if (found) {
      console.log(`Found D178012621 on page ${pageNum} at y=${targetY}\n`);
      console.log('All items on that row:\n');
      
      const rowItems = text.items
        .filter((item: any) => Math.abs(Math.round(item.transform[5]) - targetY) < 2)
        .map((item: any) => ({
          str: item.str.trim(),
          x: Math.round(item.transform[4])
        }))
        .filter((item: any) => item.str);
      
      rowItems.forEach((item: any) => {
        let col = '';
        if (item.x >= 240 && item.x < 490) col = ' ← POLICY TYPE COLUMN';
        if (item.x >= 173 && item.x < 240) col = ' ← INS.CO COLUMN';
        if (item.x >= 490 && item.x < 622) col = ' ← CLIENT NAME COLUMN';
        console.log(`   "${item.str}" @ x=${item.x}${col}`);
      });
      
      break;
    }
  }
}

debugDigit().catch(console.error);
