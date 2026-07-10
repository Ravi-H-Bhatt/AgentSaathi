import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function mapCoordinates() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const page = await doc.getPage(1);
  const text = await page.getTextContent();
  
  // Find first data row (not header)
  console.log('🔍 Mapping E-Register Column Coordinates\n');
  console.log('First 20 data items with coordinates:\n');
  
  // Skip to first actual data row (after headers)
  let foundData = false;
  let dataItems: any[] = [];
  
  text.items.forEach((item: any) => {
    const str = item.str.trim();
    const x = Math.round(item.transform[4]);
    const y = Math.round(item.transform[5]);
    
    // First data row starts with PZ10694281
    if (str === 'PZ10694281') {
      foundData = true;
    }
    
    if (foundData && dataItems.length < 25) {
      dataItems.push({ str, x, y });
      console.log(`"${str.padEnd(25)}" @ x=${String(x).padStart(4)} y=${y}`);
    }
  });
  
  console.log('\n📊 Expected Column Mapping:');
  console.log('   Tra ID:           x=32   (PZ10694281)');
  console.log('   Appl Date:        x=103  (31/12/2025)');
  console.log('   Ins.Co:           x=173-240');
  console.log('   Type of Policy:   x=283-410');
  console.log('   Name of Client:   x=509-607');
  console.log('   Proposer Name:    x=737-835');
  console.log('   PolicyNo:         x=959-1024');
  console.log('   Source Code:      x=1101');
  console.log('   Source Name:      x=1161-1292');
  console.log('   From Date:        x=1309');
  console.log('   To Date:          x=1375');
  console.log('   Basic:            x=1477');
  console.log('   GST:              x=1518');
  console.log('   Total Premium:    x=1792');
}

mapCoordinates().catch(console.error);
