/**
 * Detailed Excel analysis with better parsing
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const downloadsPath = path.join(process.env.HOME || '', 'Downloads');

async function analyzeExcelDetailed(fileName: string) {
  const filePath = path.join(downloadsPath, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${fileName}`);
    return null;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 ${fileName}`);
  console.log(`${'='.repeat(80)}`);

  const workbook = XLSX.readFile(filePath, { cellStyles: true });
  
  console.log(`\n📋 Sheets in workbook: ${workbook.SheetNames.join(', ')}`);

  // Analyze all sheets
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n  📊 Sheet: "${sheetName}"`);
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log(`     Range: ${worksheet['!ref']} (${range.e.r + 1} rows x ${range.e.c + 1} cols)`);

    // Try different parsing methods
    const jsonDefault = XLSX.utils.sheet_to_json(worksheet);
    const jsonWithHeader = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const jsonRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });

    console.log(`     Parsed rows (default): ${jsonDefault.length}`);
    console.log(`     Parsed rows (with header): ${jsonWithHeader.length}`);

    // Find actual header row by looking for common keywords
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, jsonWithHeader.length); i++) {
      const row = jsonWithHeader[i] as any[];
      const rowStr = JSON.stringify(row).toLowerCase();
      if (rowStr.includes('policy') || rowStr.includes('name') || rowStr.includes('premium') || rowStr.includes('client')) {
        headerRowIndex = i;
        console.log(`     ✅ Found header row at index: ${i}`);
        console.log(`        Headers: ${row.slice(0, 8).join(' | ')}`);
        break;
      }
    }

    if (headerRowIndex >= 0) {
      // Parse with correct header
      const jsonWithCorrectHeader = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        range: headerRowIndex 
      });
      
      const headers = jsonWithCorrectHeader[0] as any[];
      const dataRows = jsonWithCorrectHeader.slice(1).filter((row: any) => {
        return Array.isArray(row) && row.some((cell: any) => 
          cell !== null && cell !== undefined && cell !== ''
        );
      });

      console.log(`     Data rows (after header): ${dataRows.length}`);

      // Show first few data rows
      console.log(`\n     📝 First 5 data rows:`);
      dataRows.slice(0, 5).forEach((row: any, idx: number) => {
        const cells = row.slice(0, 5).map((cell: any) => 
          String(cell || '').substring(0, 20)
        );
        console.log(`       [${idx + 1}] ${cells.join(' | ')}`);
      });

      return {
        fileName,
        sheetName,
        headerRowIndex,
        headers,
        dataRowCount: dataRows.length,
        data: dataRows
      };
    }
  }

  return null;
}

async function main() {
  console.log('🔍 Detailed Excel Analysis\n');

  const files = [
    'M080 BUSINESS DETAILS 1 JAN TO 31 DEC 2.xlsx',
    'M080 BUSINESS DETAILS 1 JAN TO 31 DEC 3.xlsx',
  ];

  const results: any[] = [];

  for (const fileName of files) {
    const result = await analyzeExcelDetailed(fileName);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FINAL COMPARISON');
  console.log('='.repeat(80));

  results.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${result.fileName}`);
    console.log(`   Sheet: ${result.sheetName}`);
    console.log(`   Data rows: ${result.dataRowCount}`);
    console.log(`   Header at row: ${result.headerRowIndex}`);
  });

  if (results.length === 2) {
    const diff = Math.abs(results[0].dataRowCount - results[1].dataRowCount);
    console.log(`\n🎯 Difference: ${diff} rows`);
    
    if (diff === 100 || diff === 81) {
      console.log(`\n✅ This explains the extra ${diff} entries!`);
      console.log(`\n   File with MORE rows: ${results[0].dataRowCount > results[1].dataRowCount ? results[0].fileName : results[1].fileName}`);
      console.log(`   File with LESS rows: ${results[0].dataRowCount < results[1].dataRowCount ? results[0].fileName : results[1].fileName}`);
    }
  }
}

main().catch(console.error);
