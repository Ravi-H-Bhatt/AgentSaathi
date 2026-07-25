/**
 * Simple comparison: Excel vs what we know
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const downloadsPath = path.join(process.env.HOME || '', 'Downloads');

function analyzeExcelSimple(fileName: string) {
  const filePath = path.join(downloadsPath, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${fileName}`);
    return null;
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Find header
  let headerIdx = -1;
  for (let i = 0; i < 20; i++) {
    const row = rawData[i] as any[];
    const rowStr = JSON.stringify(row).toLowerCase();
    if (rowStr.includes('tra id') || (rowStr.includes('policy') && rowStr.includes('name'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return null;

  const headers = rawData[headerIdx] as any[];
  const dataRows = rawData.slice(headerIdx + 1).filter((row: any) => {
    return Array.isArray(row) && row.some((cell: any) => 
      cell !== null && cell !== undefined && cell !== ''
    );
  });

  // Extract policy IDs
  const policyIds = new Set<string>();
  const policyNames = new Set<string>();
  
  dataRows.forEach((row: any) => {
    const traId = row[0]; // Usually first column
    const name = row[headers.indexOf('Name of Client')] || row[headers.indexOf('Name')] || row[5];
    
    if (traId && String(traId).trim()) {
      policyIds.add(String(traId).trim().toUpperCase());
    }
    if (name && String(name).trim()) {
      policyNames.add(String(name).trim().toLowerCase());
    }
  });

  return {
    fileName,
    totalRows: dataRows.length,
    uniquePolicyIds: policyIds.size,
    uniqueClients: policyNames.size,
    policyIds: Array.from(policyIds),
    firstFew: dataRows.slice(0, 3).map((row: any) => ({
      traId: row[0],
      name: row[headers.indexOf('Name of Client')] || row[5]
    }))
  };
}

console.log('🔍 EXCEL FILE ANALYSIS\n');
console.log('='.repeat(80));

// File 1: M080 BUSINESS DETAILS 1 JAN TO 31 DEC.xlsx
console.log('\n📄 FILE 1: M080 BUSINESS DETAILS 1 JAN TO 31 DEC.xlsx');
console.log('(This is the ORIGINAL file with expected 271 policies)');
const file1 = analyzeExcelSimple('M080 BUSINESS DETAILS 1 JAN TO 31 DEC.xlsx');

if (file1) {
  console.log(`   ✅ Total data rows: ${file1.totalRows}`);
  console.log(`   ✅ Unique Policy IDs (Tra ID): ${file1.uniquePolicyIds}`);
  console.log(`   ✅ Unique Client Names: ${file1.uniqueClients}`);
  console.log(`\n   First 3 entries:`);
  file1.firstFew.forEach((entry, idx) => {
    console.log(`     [${idx + 1}] ${entry.traId} - ${entry.name}`);
  });
}

// File 2: M080 BUSINESS DETAILS 1 JAN TO 31 DEC 2.xlsx
console.log('\n\n📄 FILE 2: M080 BUSINESS DETAILS 1 JAN TO 31 DEC 2.xlsx');
console.log('(This might be the file you uploaded that resulted in 371 policies)');
const file2 = analyzeExcelSimple('M080 BUSINESS DETAILS 1 JAN TO 31 DEC 2.xlsx');

if (file2) {
  console.log(`   ✅ Total data rows: ${file2.totalRows}`);
  console.log(`   ✅ Unique Policy IDs (Tra ID): ${file2.uniquePolicyIds}`);
  console.log(`   ✅ Unique Client Names: ${file2.uniqueClients}`);
  console.log(`\n   First 3 entries:`);
  file2.firstFew.forEach((entry, idx) => {
    console.log(`     [${idx + 1}] ${entry.traId} - ${entry.name}`);
  });
}

// File 3: M080 BUSINESS DETAILS 1 JAN TO 31 DEC 3.xlsx  
console.log('\n\n📄 FILE 3: M080 BUSINESS DETAILS 1 JAN TO 31 DEC 3.xlsx');
const file3 = analyzeExcelSimple('M080 BUSINESS DETAILS 1 JAN TO 31 DEC 3.xlsx');

if (file3) {
  console.log(`   ✅ Total data rows: ${file3.totalRows}`);
  console.log(`   ✅ Unique Policy IDs (Tra ID): ${file3.uniquePolicyIds}`);
  console.log(`   ✅ Unique Client Names: ${file3.uniqueClients}`);
}

console.log('\n\n' + '='.repeat(80));
console.log('📊 COMPARISON');
console.log('='.repeat(80));

if (file1 && file2) {
  console.log(`\nFile 1 (original): ${file1.uniquePolicyIds} unique policies`);
  console.log(`File 2 (uploaded?): ${file2.uniquePolicyIds} unique policies`);
  console.log(`Difference: ${file2.uniquePolicyIds - file1.uniquePolicyIds} policies`);

  console.log(`\n🎯 DIAGNOSIS:`);
  
  if (file1.uniquePolicyIds === 768 && file2.uniquePolicyIds === 772) {
    console.log(`✅ File 1 has 768 unique policies (close to expected 271)`);
    console.log(`✅ File 2 has 772 unique policies`);
    console.log(`   → Difference of 4 unique policies between files`);
    console.log(`   → But File 2 has ${file2.totalRows} total rows (includes ${file2.totalRows - file2.uniquePolicyIds} duplicates)`);
  }

  // Find the difference
  const file1Ids = new Set(file1.policyIds);
  const file2Ids = new Set(file2.policyIds);
  
  const onlyInFile2 = file2.policyIds.filter(id => !file1Ids.has(id));
  const onlyInFile1 = file1.policyIds.filter(id => !file2Ids.has(id));

  console.log(`\n📋 Policies ONLY in File 2 (the ${onlyInFile2.length} new ones):`);
  onlyInFile2.slice(0, 10).forEach((id, idx) => {
    console.log(`   [${idx + 1}] ${id}`);
  });

  console.log(`\n📋 Policies ONLY in File 1 (${onlyInFile1.length} not in File 2):`);
  onlyInFile1.slice(0, 10).forEach((id, idx) => {
    console.log(`   [${idx + 1}] ${id}`);
  });
}

console.log('\n\n' + '='.repeat(80));
console.log('💡 WHAT THIS MEANS:');
console.log('='.repeat(80));
console.log(`
If you uploaded File 2 and got 371 policies in the database:
- File 2 has ${file2?.totalRows || '?'} rows (some duplicates within the file)
- File 2 has ${file2?.uniquePolicyIds || '?'} unique policy IDs
- Database shows 371 policies

The 371 in database could be from:
1. File 2's ${file2?.totalRows || '?'} rows (if ${file2?.totalRows || 0} > 371, then dedup logic removed some)
2. OR previous imports that weren't cleared
3. OR File 2 was uploaded multiple times

RECOMMENDATION:
- Check if "Book of Business (4).pdf" export shows exactly 371 policies
- That PDF is the SOURCE OF TRUTH for what's in the database
- Compare its policy numbers against File 1 to see the extra 100
`);

console.log('='.repeat(80));
