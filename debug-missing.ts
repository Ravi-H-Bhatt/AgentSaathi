import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugMissing() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  // Count PZ IDs vs extracted records
  let totalPZIds = 0;
  const allYPositions: number[] = [];
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    
    text.items.forEach((item: any) => {
      const str = item.str.trim();
      const x = Math.round(item.transform[4]);
      const y = Math.round(item.transform[5]);
      
      if (/^PZ\d{8}$/.test(str) && x >= 28 && x <= 36) {
        totalPZIds++;
        allYPositions.push(y);
      }
    });
  }
  
  console.log(`Total PZ IDs found: ${totalPZIds}`);
  console.log(`Total extracted: 590`);
  console.log(`Missing: ${totalPZIds - 590}`);
  
  // Check if some rows have no client name in expected column
  console.log('\n🔍 Checking for rows without names in column x=509-607...\n');
  
  for (let pageNum = 1; pageNum <= 2; pageNum++) {  // Check first 2 pages
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    
    const items: any[] = [];
    text.items.forEach((item: any) => {
      items.push({
        str: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5])
      });
    });
    
    // Find PZ IDs
    const pzIds = items.filter(item => 
      /^PZ\d{8}$/.test(item.str) && item.x >= 28 && item.x <= 36
    );
    
    console.log(`Page ${pageNum}: ${pzIds.length} PZ IDs`);
    
    // For each PZ ID, check if there's text in the client name column
    pzIds.slice(0, 5).forEach(pz => {
      const sameRow = items.filter(item => 
        item.y === pz.y && item.x >= 509 && item.x < 607
      );
      
      console.log(`   ${pz.str} @ y=${pz.y}: name column has ${sameRow.length} items:`);
      sameRow.forEach(item => console.log(`      "${item.str}" @ x=${item.x}`));
      
      if (sameRow.length === 0) {
        // Check what's around that Y position
        const nearby = items.filter(item => 
          Math.abs(item.y - pz.y) < 3
        ).slice(0, 15);
        console.log(`      EMPTY NAME! Nearby items on this row:`);
        nearby.forEach(item => console.log(`         "${item.str}" @ x=${item.x}`));
      }
    });
  }
}

debugMissing().catch(console.error);
