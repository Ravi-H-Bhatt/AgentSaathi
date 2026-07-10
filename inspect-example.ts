import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function inspectPDF() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  console.log(`📄 Total Pages: ${doc.numPages}`);
  
  // Check first page
  const page1 = await doc.getPage(1);
  const text1 = await page1.getTextContent();
  
  console.log('\n📋 First 100 text items from page 1:\n');
  text1.items.slice(0, 100).forEach((item: any, i) => {
    console.log(`${i}: "${item.str}" @ x=${Math.round(item.transform[4])}, y=${Math.round(item.transform[5])}`);
  });
  
  // Look for policy numbers
  const allText = text1.items.map((item: any) => item.str).join(' ');
  console.log('\n\n🔍 Looking for policy number patterns...');
  console.log('Has "210600": ', allText.includes('210600'));
  console.log('Has "Policy": ', /policy/i.test(allText));
  console.log('Has numbers 18+ digits: ', /\d{18,}/.test(allText));
  
  // Show a sample of concatenated text
  console.log('\n📝 First 500 chars of text:');
  console.log(allText.slice(0, 500));
}

inspectPDF().catch(console.error);
