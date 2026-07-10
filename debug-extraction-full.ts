import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugExtraction() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example_compressed.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  // Extract items
  const allItems: any[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageHeight = page.view[3];
    const yOffset = (pageNum - 1) * (pageHeight + 100);
    
    textContent.items.forEach((item: any) => {
      if (item.str.trim()) {
        allItems.push({
          str: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]) + yOffset,
        });
      }
    });
  }
  
  // Find PZ IDs
  const recordYs: number[] = [];
  allItems.forEach(item => {
    if (/^PZ\d{8}$/.test(item.str) && item.x >= 28 && item.x <= 36) {
      if (!recordYs.includes(item.y)) {
        recordYs.push(item.y);
      }
    }
  });
  
  recordYs.sort((a, b) => b - a);
  
  console.log(`Found ${recordYs.length} record positions\n`);
  
  // Check first 5 records
  for (let i = 0; i < Math.min(5, recordYs.length); i++) {
    const yStart = recordYs[i];
    const yEnd = i + 1 < recordYs.length ? recordYs[i + 1] + 5 : 0;
    
    // Extract client name column
    const clientNameItems = allItems.filter(item =>
      item.y >= yEnd &&
      item.y <= yStart &&
      item.x >= 490 &&
      item.x < 622
    );
    
    const clientName = clientNameItems.map(item => item.str).join(' ').trim();
    
    console.log(`${i + 1}. y=${yStart}, yEnd=${yEnd}`);
    console.log(`   Client name: "${clientName}" (${clientNameItems.length} items)`);
    if (!clientName) {
      console.log(`   ⚠️  EMPTY - will be filtered out!`);
    }
  }
}

debugExtraction().catch(console.error);
