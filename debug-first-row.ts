import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugFirstRow() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example_compressed.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const page = await doc.getPage(1);
  const text = await page.getTextContent();
  
  const items: any[] = [];
  text.items.forEach((item: any) => {
    items.push({
      str: item.str.trim(),
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5])
    });
  });
  
  // Find all PZ IDs on page 1
  const pzIds = items.filter(item => 
    /^PZ\d{8}$/.test(item.str) && item.x >= 28 && item.x <= 36
  );
  
  console.log(`Found ${pzIds.length} PZ IDs on page 1\n`);
  
  // Check first 3 rows
  pzIds.slice(0, 3).forEach((pz, i) => {
    console.log(`\n${i + 1}. ${pz.str} at y=${pz.y}`);
    
    // Get client name column (x=490-622)
    const nameItems = items.filter(item => 
      item.y === pz.y && item.x >= 490 && item.x < 622
    );
    
    console.log(`   Name column has ${nameItems.length} items:`);
    nameItems.forEach(item => console.log(`      "${item.str}" @ x=${item.x}`));
    
    if (nameItems.length === 0) {
      console.log(`   ⚠️  NO NAME FOUND - This row will be skipped!`);
    }
  });
}

debugFirstRow().catch(console.error);
