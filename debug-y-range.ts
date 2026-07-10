import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugYRange() {
  const { getDocumentProxy } = await import('unpdf');
  
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  const allItems: any[] = [];
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const pageHeight = page.view[3];
    const yOffset = (pageNum - 1) * (pageHeight + 100);
    
    textContent.items.forEach((item: any) => {
      if (item.str.trim() && /^PZ\d{8}$/.test(item.str.trim())) {
        const x = Math.round(item.transform[4]);
        const y = Math.round(item.transform[5]) + yOffset;
        allItems.push({
          page: pageNum,
          str: item.str.trim(),
          x,
          y,
          yOffset,
          originalY: Math.round(item.transform[5])
        });
      }
    });
  }
  
  console.log('Total Tra IDs found:', allItems.length);
  console.log('\nFirst 3 Tra IDs:');
  allItems.slice(0, 3).forEach(item => console.log(item));
  
  console.log('\nLast 3 Tra IDs:');
  allItems.slice(-3).forEach(item => console.log(item));
  
  // Sort by Y ascending
  allItems.sort((a, b) => a.y - b.y);
  console.log('\nAfter sorting (ascending Y):');
  console.log('First:', allItems[0]);
  console.log('Last:', allItems[allItems.length - 1]);
}

debugYRange().catch(console.error);
