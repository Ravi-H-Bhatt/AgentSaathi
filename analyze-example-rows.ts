import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function analyzeRows() {
  const { getDocumentProxy } = await import('unpdf');
  const pdfPath = join(homedir(), 'Downloads', 'example.pdf');
  const buffer = readFileSync(pdfPath);
  
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  let totalRows = 0;
  let uniqueTraIDs = new Set<string>();
  let uniquePolicyNumbers = new Set<string>();
  
  console.log(`📄 Analyzing ${doc.numPages} pages...\n`);
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    
    let pageRows = 0;
    
    text.items.forEach((item: any) => {
      const str = item.str.trim();
      
      // Tra ID pattern: PZ followed by digits
      if (/^PZ\d{8}$/.test(str)) {
        uniqueTraIDs.add(str);
        pageRows++;
      }
      
      // Policy number patterns (various formats)
      if (/^[A-Z]\d{9,}$/.test(str)) {
        uniquePolicyNumbers.add(str);
      }
    });
    
    totalRows += pageRows;
    console.log(`Page ${pageNum}: ${pageRows} records (Tra IDs)`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`📊 TOTAL RECORDS: ${totalRows} (by Tra ID count)`);
  console.log(`📊 UNIQUE Tra IDs: ${uniqueTraIDs.size}`);
  console.log(`📊 UNIQUE Policy Numbers: ${uniquePolicyNumbers.size}`);
  console.log('='.repeat(80));
  
  console.log('\n📝 Sample Tra IDs (first 10):');
  Array.from(uniqueTraIDs).slice(0, 10).forEach(id => console.log(`   ${id}`));
  
  console.log('\n📝 Sample Policy Numbers (first 10):');
  Array.from(uniquePolicyNumbers).slice(0, 10).forEach(num => console.log(`   ${num}`));
}

analyzeRows().catch(console.error);
