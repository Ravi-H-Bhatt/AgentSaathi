/**
 * FINAL DIAGNOSIS: Why 371 instead of 271?
 * 
 * This script will:
 * 1. Analyze both Excel files row by row
 * 2. Identify the exact 100 extra entries
 * 3. Show what makes them different
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const downloadsPath = path.join(process.env.HOME || '', 'Downloads');

function analyzeSheet(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get raw data
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
  
  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i] as any[];
    const rowStr = JSON.stringify(row).toLowerCase();
    if (rowStr.includes('policy') && (rowStr.includes('name') || rowStr.includes('client'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.log('❌ Could not find header row');
    return null;
  }

  const headers = rawData[headerIdx] as any[];
  const dataRows = rawData.slice(headerIdx + 1).filter((row: any) => {
    return Array.isArray(row) && row.some((cell: any) => 
      cell !== null && cell !== undefined && cell !== ''
    );
  });

  // Parse into structured data
  const policies = dataRows.map((row: any, idx: number) => {
    const obj: any = { __rowIndex: idx };
    headers.forEach((header, colIdx) => {
      obj[String(header)] = row[colIdx] || '';
    });
    return obj;
  });

  return {
    headers,
    headerIdx,
    dataRows,
    policies,
    count: policies.length
  };
}

function getPolicyKey(policy: any): string {
  // Create a unique key from multiple fields
  const policyNum = policy['Tra ID'] || policy['Policy No'] || policy['Policy Number'] || '';
  const name = policy['Name of Client'] || policy['Name'] || policy['CLIENT NAME'] || '';
  const premium = policy['Premium'] || policy['PREMIUM'] || '';
  const product = policy['Type Of Policy'] || policy['Type of Policy'] || policy['POLICY TYPE'] || '';
  
  return `${policyNum}|${name}|${premium}|${product}`.toLowerCase().trim();
}

async function main() {
  console.log('🔍 FINAL DIAGNOSIS: 371 vs 271 Entries\n');
  console.log('='.repeat(80) + '\n');

  const file1Path = path.join(downloadsPath, 'M080 BUSINESS DETAILS 1 JAN TO 31 DEC 2.xlsx');
  const file2Path = path.join(downloadsPath, 'M080 BUSINESS DETAILS 1 JAN TO 31 DEC.xlsx');

  console.log('📄 File 1: M080 BUSINESS DETAILS 1 JAN TO 31 DEC 2.xlsx (the UPLOADED one with 371)');
  const file1 = analyzeSheet(file1Path);
  
  console.log('📄 File 2: M080 BUSINESS DETAILS 1 JAN TO 31 DEC.xlsx (the ORIGINAL one with expected 271)');
  const file2 = analyzeSheet(file2Path);

  if (!file1 || !file2) {
    console.log('❌ Could not parse files');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 RAW COUNTS');
  console.log('='.repeat(80));
  console.log(`File 1: ${file1.count} policies`);
  console.log(`File 2: ${file2.count} policies`);
  console.log(`Difference: ${Math.abs(file1.count - file2.count)} policies`);

  // Build sets of policy keys
  const file1Keys = new Set(file1.policies.map(getPolicyKey));
  const file2Keys = new Set(file2.policies.map(getPolicyKey));

  console.log(`\nUnique keys in File 1: ${file1Keys.size}`);
  console.log(`Unique keys in File 2: ${file2Keys.size}`);

  // Find entries only in File 1
  const onlyInFile1 = file1.policies.filter(p => {
    const key = getPolicyKey(p);
    return !file2Keys.has(key);
  });

  // Find entries only in File 2
  const onlyInFile2 = file2.policies.filter(p => {
    const key = getPolicyKey(p);
    return !file1Keys.has(key);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎯 DIFFERENCE ANALYSIS');
  console.log('='.repeat(80));
  console.log(`\nEntries ONLY in File 1 (uploaded): ${onlyInFile1.length}`);
  console.log(`Entries ONLY in File 2 (comparison): ${onlyInFile2.length}`);

  if (onlyInFile1.length > 0) {
    console.log('\n📋 EXTRA ENTRIES IN FILE 1 (First 20):');
    console.log('-'.repeat(80));
    onlyInFile1.slice(0, 20).forEach((policy, idx) => {
      const traId = policy['Tra ID'] || policy['Policy No'] || 'N/A';
      const name = policy['Name of Client'] || policy['Name'] || 'N/A';
      const company = policy['Ins.Co'] || policy['Company'] || 'N/A';
      const type = policy['Type Of Policy'] || policy['Type of Policy'] || 'N/A';
      const premium = policy['Premium'] || policy['PREMIUM'] || 'N/A';
      
      console.log(`\n[${idx + 1}] Tra ID: ${traId}`);
      console.log(`    Name: ${name}`);
      console.log(`    Company: ${company}`);
      console.log(`    Type: ${type}`);
      console.log(`    Premium: ${premium}`);
    });

    if (onlyInFile1.length > 20) {
      console.log(`\n... and ${onlyInFile1.length - 20} more entries`);
    }
  }

  // Check for duplicates within File 1
  const file1KeyCounts = new Map<string, number>();
  file1.policies.forEach(p => {
    const key = getPolicyKey(p);
    file1KeyCounts.set(key, (file1KeyCounts.get(key) || 0) + 1);
  });

  const duplicatesInFile1 = Array.from(file1KeyCounts.entries())
    .filter(([_, count]) => count > 1);

  console.log('\n' + '='.repeat(80));
  console.log('🔄 DUPLICATES WITHIN FILE 1');
  console.log('='.repeat(80));
  console.log(`Duplicate entries: ${duplicatesInFile1.length}`);
  
  if (duplicatesInFile1.length > 0) {
    const totalDuplicates = duplicatesInFile1.reduce((sum, [_, count]) => sum + (count - 1), 0);
    console.log(`Total extra rows from duplicates: ${totalDuplicates}`);
    
    console.log('\nFirst 5 duplicate sets:');
    duplicatesInFile1.slice(0, 5).forEach(([key, count]) => {
      const parts = key.split('|');
      console.log(`  - Appears ${count} times: ${parts[0]} (${parts[1]})`);
    });
  }

  // SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('📝 SUMMARY & DIAGNOSIS');
  console.log('='.repeat(80));
  
  const expectedDiff = 371 - 271;
  const actualDiff = file1.count - file2.count;
  
  console.log(`\n✅ Expected difference: ${expectedDiff} rows`);
  console.log(`✅ Actual difference: ${actualDiff} rows`);
  console.log(`✅ Match: ${Math.abs(actualDiff - expectedDiff) <= 10 ? 'YES' : 'NO'}`);
  
  console.log('\n📌 LIKELY REASONS FOR EXTRA ENTRIES:');
  
  if (onlyInFile1.length > 50) {
    console.log(`\n1. File 1 contains ${onlyInFile1.length} policies not in File 2`);
    console.log('   → These are ADDITIONAL policies added between the two file versions');
  }
  
  if (duplicatesInFile1.length > 0) {
    const dupeCount = duplicatesInFile1.reduce((sum, [_, count]) => sum + (count - 1), 0);
    console.log(`\n2. File 1 has ${dupeCount} duplicate entries within itself`);
    console.log('   → Same policy listed multiple times in the Excel file');
  }
  
  if (file1.count === 847 && file2.count === 768) {
    console.log(`\n3. File 1 has 847 data rows, File 2 has 768 data rows`);
    console.log('   → Difference of 79 rows (close to 100)');
    console.log('   → If database shows 371, but file has 847, the import logic filtered out many rows');
  }

  console.log('\n🔍 NEXT STEPS:');
  console.log('1. Check the database to see the actual count: SELECT COUNT(*) FROM policies;');
  console.log('2. The bulk import API may be filtering/deduplicating during import');
  console.log('3. Look at the logs when the file was uploaded to see how many were actually imported');
  console.log('4. The difference might be due to:');
  console.log('   - Rows without client names (skipped)');
  console.log('   - Duplicate policy numbers (skipped)');
  console.log('   - Rows with matching details (skipped by dedup logic)');
  
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
