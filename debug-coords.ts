import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function debugCoords() {
  const { getDocumentProxy } = await import('unpdf');
  
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  console.log('Total pages:', doc.numPages);
  
  // Check first page
  const page1 = await doc.getPage(1);
  const content1 = await page1.getTextContent();
  const names1 = content1.items
    .filter((item: any) => item.str.includes('MANOJ'))
    .map((item: any) => ({
      str: item.str,
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
    }));
  
  console.log('\nPage 1 - MANOJ mentions:', names1);
  
  // Check last page
  const lastPage = await doc.getPage(doc.numPages);
  const contentLast = await lastPage.getTextContent();
  const namesLast = contentLast.items
    .filter((item: any) => item.str.includes('LALITBHAI'))
    .map((item: any) => ({
      str: item.str,
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
    }));
  
  console.log('\nLast page - LALITBHAI mentions:', namesLast);
  
  // Get page heights
  console.log('\nPage 1 height:', page1.view[3]);
  console.log('Last page height:', lastPage.view[3]);
}

debugCoords().catch(console.error);
