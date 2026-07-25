/**
 * Analyze Excel files to count rows and find the 100 extra entries
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const downloadsPath = path.join(process.env.HOME || '', 'Downloads');

const excelFiles = [
  'M080 BUSINESS DETAILS 1 JAN TO 31 DEC 2.xlsx', // This might be the one uploaded (271 expected)
  'M080 BUSINESS DETAILS 1 JAN TO 31 DEC 3.xlsx',
  'M080 BUSINESS DETAILS 1 JAN TO 31 DEC.xlsx',
];

async function analyzeExcelFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return null;
  }

  console.log(`\n📄 Analyzing: ${path.basename(filePath)}`);
  console.log(`   Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON to count rows
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Count non-empty rows
    const nonEmptyRows = data.filter((row: any) => 
      row && Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')
    );

    const totalRows = data.length;
    const nonEmptyCount = nonEmptyRows.length;
    const dataRows = nonEmptyCount - 1; // Excluding header

    console.log(`   Total rows: ${totalRows}`);
    console.log(`   Non-empty rows: ${nonEmptyCount}`);
    console.log(`   Data rows (excluding header): ${dataRows}`);

    // Get header row
    const headers = data[0] as any[];
    console.log(`   Columns: ${headers?.length || 0}`);
    if (headers && headers.length > 0) {
      console.log(`   Header preview: ${headers.slice(0, 5).join(', ')}`);
    }

    // Check for hidden rows by analyzing the full data
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`   Parsed JSON rows: ${jsonData.length}`);

    // Sample first few rows
    console.log('\n   📋 First 3 data rows:');
    jsonData.slice(0, 3).forEach((row: any, idx: number) => {
      const policyNum = row['Policy No'] || row['Policy Number'] || row['POLICY NO'] || 'N/A';
      const clientName = row['Name'] || row['Client Name'] || row['CLIENT NAME'] || 'N/A';
      console.log(`     [${idx + 1}] Policy: ${policyNum}, Client: ${clientName}`);
    });

    return {
      fileName: path.basename(filePath),
      totalRows,
      nonEmptyRows,
      dataRows,
      jsonRowCount: jsonData.length,
      columns: headers?.length || 0,
      data: jsonData
    };
  } catch (error) {
    console.error(`   ❌ Error reading file:`, error);
    return null;
  }
}

async function main() {
  console.log('🔍 Analyzing Excel files in Downloads folder...\n');

  const results: any[] = [];

  for (const fileName of excelFiles) {
    const filePath = path.join(downloadsPath, fileName);
    const result = await analyzeExcelFile(filePath);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n\n📊 SUMMARY COMPARISON:');
  console.log('='.repeat(80));
  
  results.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${result.fileName}`);
    console.log(`   Data rows: ${result.dataRows}`);
    console.log(`   JSON parsed rows: ${result.jsonRowCount}`);
  });

  // Find differences
  if (results.length >= 2) {
    console.log('\n\n🔍 DIFFERENCE ANALYSIS:');
    console.log('='.repeat(80));
    
    const file1 = results.find(r => r.fileName.includes('2.xlsx'));
    const file2 = results.find(r => r.fileName.includes('3.xlsx'));
    
    if (file1 && file2) {
      console.log(`\n${file1.fileName} has ${file1.jsonRowCount} rows`);
      console.log(`${file2.fileName} has ${file2.jsonRowCount} rows`);
      console.log(`Difference: ${Math.abs(file1.jsonRowCount - file2.jsonRowCount)} rows`);

      // If one has 371 and other has 271, find the difference
      if (Math.abs(file1.jsonRowCount - file2.jsonRowCount) === 100) {
        console.log('\n✅ Found the 100-row difference!');
        
        const largerFile = file1.jsonRowCount > file2.jsonRowCount ? file1 : file2;
        const smallerFile = file1.jsonRowCount < file2.jsonRowCount ? file1 : file2;
        
        console.log(`\n${largerFile.fileName} has 100 extra rows compared to ${smallerFile.fileName}`);
        
        // Try to identify what the extra rows are
        const largerPolicyNums = new Set(
          largerFile.data.map((row: any) => 
            row['Policy No'] || row['Policy Number'] || row['POLICY NO'] || ''
          )
        );
        
        const smallerPolicyNums = new Set(
          smallerFile.data.map((row: any) => 
            row['Policy No'] || row['Policy Number'] || row['POLICY NO'] || ''
          )
        );

        const extraInLarger = largerFile.data.filter((row: any) => {
          const policyNum = row['Policy No'] || row['Policy Number'] || row['POLICY NO'] || '';
          return !smallerPolicyNums.has(policyNum);
        });

        console.log(`\n🎯 Extra rows in ${largerFile.fileName}: ${extraInLarger.length}`);
        if (extraInLarger.length > 0) {
          console.log('\nFirst 10 extra rows:');
          extraInLarger.slice(0, 10).forEach((row: any, idx: number) => {
            const policyNum = row['Policy No'] || row['Policy Number'] || row['POLICY NO'] || 'N/A';
            const clientName = row['Name'] || row['Client Name'] || row['CLIENT NAME'] || 'N/A';
            console.log(`  [${idx + 1}] Policy: ${policyNum}, Client: ${clientName}`);
          });
        }
      }
    }
  }
}

main().catch(console.error);
