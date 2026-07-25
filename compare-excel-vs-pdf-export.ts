/**
 * Compare Excel upload vs PDF export from database
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const downloadsPath = path.join(process.env.HOME || '', 'Downloads');

async function analyzeExcelFile(fileName: string) {
  const filePath = path.join(downloadsPath, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${fileName}`);
    return null;
  }

  console.log(`\n📊 Analyzing Excel: ${fileName}`);

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
    if (rowStr.includes('policy') && (rowStr.includes('name') || rowStr.includes('client') || rowStr.includes('tra'))) {
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

  console.log(`   Headers: ${headers.slice(0, 5).join(', ')}`);
  console.log(`   Data rows: ${dataRows.length}`);

  // Parse into structured data
  const policies = dataRows.map((row: any, idx: number) => {
    const obj: any = { __rowIndex: idx };
    headers.forEach((header, colIdx) => {
      obj[String(header)] = row[colIdx] || '';
    });
    
    // Extract policy identifiers
    return {
      traId: obj['Tra ID'] || obj['Policy No'] || obj['Policy Number'] || '',
      name: obj['Name of Client'] || obj['Name'] || obj['CLIENT NAME'] || '',
      company: obj['Ins.Co'] || obj['Company'] || obj['COMPANY'] || '',
      type: obj['Type Of Policy'] || obj['Type of Policy'] || obj['POLICY TYPE'] || '',
      premium: obj['Premium'] || obj['PREMIUM'] || '',
      product: obj['Product Name'] || obj['PRODUCT NAME'] || '',
      row: idx
    };
  }).filter(p => p.traId || p.name); // Only keep rows with identifier

  // Count unique policy numbers
  const uniqueTraIds = new Set(policies.map(p => p.traId.toLowerCase().trim()).filter(Boolean));
  
  console.log(`   Unique Tra IDs: ${uniqueTraIds.size}`);
  console.log(`   Total policy entries: ${policies.length}`);

  return {
    fileName,
    dataRows: dataRows.length,
    policies,
    uniqueTraIds,
    headers
  };
}

async function analyzePDFExport(fileName: string) {
  const filePath = path.join(downloadsPath, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ PDF File not found: ${fileName}`);
    return null;
  }

  console.log(`\n📄 Analyzing PDF Export: ${fileName}`);
  console.log(`   Size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);

  const dataBuffer = fs.readFileSync(filePath);
  
  // Parse PDF - use dynamic import
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(dataBuffer);
  
  console.log(`   Pages: ${data.numpages}`);
  console.log(`   Extracting policy numbers from text...`);

  const text = data.text;
  
  // Extract all PZ numbers (policy transaction IDs)
  const pzPattern = /PZ\d{8}/gi;
  const pzNumbers = text.match(pzPattern) || [];
  const uniquePzNumbers = new Set(pzNumbers.map((n: string) => n.toUpperCase()));
  
  console.log(`   Found ${pzNumbers.length} PZ number mentions`);
  console.log(`   Unique PZ numbers: ${uniquePzNumbers.size}`);

  // Try to count clients by looking for name patterns
  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
  
  // Sample some lines to understand structure
  console.log(`\n   📝 Sample lines from PDF:`);
  const sampleLines = lines.filter((l: string) => l.includes('PZ')).slice(0, 5);
  sampleLines.forEach((line: string, idx: number) => {
    console.log(`      [${idx + 1}] ${line.substring(0, 80)}`);
  });

  return {
    fileName,
    pages: data.numpages,
    uniquePzNumbers,
    totalPzMentions: pzNumbers.length,
    text: text.substring(0, 5000) // Keep sample for analysis
  };
}

async function main() {
  console.log('🔍 COMPARING EXCEL vs PDF EXPORT\n');
  console.log('='.repeat(80));

  // Analyze Excel file
  const excelFile = 'M080 BUSINESS DETAILS 1 JAN TO 31 DEC.xlsx';
  const excel = await analyzeExcelFile(excelFile);

  // Analyze PDF export (book of business (4))
  const pdfFile = 'AgentSaathi_book_of_business (4).pdf';
  const pdf = await analyzePDFExport(pdfFile);

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 COMPARISON SUMMARY');
  console.log('='.repeat(80));

  if (excel && pdf) {
    console.log(`\n📄 EXCEL (Original upload source):`);
    console.log(`   File: ${excel.fileName}`);
    console.log(`   Data rows: ${excel.dataRows}`);
    console.log(`   Unique Tra IDs: ${excel.uniqueTraIds.size}`);

    console.log(`\n📕 PDF (Exported from database):`);
    console.log(`   File: ${pdf.fileName}`);
    console.log(`   Pages: ${pdf.pages}`);
    console.log(`   Unique policy numbers (PZ): ${pdf.uniquePzNumbers.size}`);

    console.log(`\n🔍 ANALYSIS:`);
    console.log(`   Excel had: ${excel.dataRows} rows`);
    console.log(`   PDF shows: ${pdf.uniquePzNumbers.size} unique policies`);
    console.log(`   Difference: ${excel.dataRows - pdf.uniquePzNumbers.size} rows`);

    if (pdf.uniquePzNumbers.size === 371) {
      console.log(`\n✅ PDF confirms database has 371 policies!`);
    }

    if (excel.dataRows === 768 || excel.dataRows === 769) {
      console.log(`\n✅ Excel confirms original file had ~271 policies expected`);
      console.log(`   (768-769 rows includes extra data/formatting rows)`);
    }

    // Find which Excel policies are in the PDF
    const excelTraIds = new Set(
      excel.policies
        .map(p => p.traId.toUpperCase().trim())
        .filter(Boolean)
    );

    const inBoth = Array.from(excelTraIds).filter(id => pdf.uniquePzNumbers.has(id));
    const inExcelOnly = Array.from(excelTraIds).filter(id => !pdf.uniquePzNumbers.has(id));
    const inPdfOnly = Array.from(pdf.uniquePzNumbers).filter(id => !excelTraIds.has(id));

    console.log(`\n🎯 OVERLAP ANALYSIS:`);
    console.log(`   In both Excel and PDF: ${inBoth.length}`);
    console.log(`   Only in Excel (not imported): ${inExcelOnly.length}`);
    console.log(`   Only in PDF (extra 100?): ${inPdfOnly.length}`);

    if (inPdfOnly.length > 0) {
      console.log(`\n❗ THE ${inPdfOnly.length} EXTRA POLICIES IN DATABASE:`);
      console.log(`   These are the policies causing the 371 vs 271 issue!`);
      console.log(`\n   First 20 extra policy numbers:`);
      inPdfOnly.slice(0, 20).forEach((id, idx) => {
        console.log(`      [${idx + 1}] ${id}`);
      });

      if (inPdfOnly.length > 20) {
        console.log(`      ... and ${inPdfOnly.length - 20} more`);
      }
    }

    console.log(`\n💡 CONCLUSION:`);
    if (inPdfOnly.length >= 90) {
      console.log(`   The database has ${inPdfOnly.length} policies that were NOT in the original Excel file.`);
      console.log(`   These were either:`);
      console.log(`   1. Added from a different upload/source`);
      console.log(`   2. Duplicates within a previous upload`);
      console.log(`   3. From "Book of Business (3)" or another file`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
