import * as fs from 'fs';
import * as path from 'path';
import { extractPdfText } from './src/lib/pdf';
import { looksLikeUnitedIndiaRegister, parseUnitedIndiaRegister } from './src/lib/unitedindia-register';

async function testRegisterParser() {
  console.log('=== Testing United India Premium Register Parser ===\n');
  
  // Read the PDF file
  const pdfPath = process.argv[2] || './07-2026.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ File not found: ${pdfPath}`);
    console.log('\nUsage: npx ts-node test-united-india-register.ts <path-to-pdf>');
    process.exit(1);
  }
  
  console.log(`📄 Reading: ${path.basename(pdfPath)}\n`);
  
  // Extract text from PDF
  const buffer = fs.readFileSync(pdfPath);
  const text = await extractPdfText(buffer);
  
  console.log(`📊 Extracted ${text.length} characters\n`);
  console.log('--- First 500 characters ---');
  console.log(text.substring(0, 500));
  console.log('...\n');
  
  // Test detection
  const isDetected = looksLikeUnitedIndiaRegister(text);
  console.log('--- Detection Check ---');
  console.log('Is United India Premium Register?', isDetected ? '✅ YES' : '❌ NO');
  
  if (!isDetected) {
    console.error('\n❌ Document not detected as United India Premium Register!');
    console.log('\nChecking for key indicators:');
    console.log('- Contains "united india insurance":', text.toLowerCase().includes('united india insurance'));
    console.log('- Contains "premium register":', text.toLowerCase().includes('premium register'));
    console.log('- Contains "policy number":', text.toLowerCase().includes('policy number'));
    console.log('- Contains "insured name":', text.toLowerCase().includes('insured name'));
    return;
  }
  
  // Test parsing
  console.log('\n--- Parsing Register ---');
  try {
    const rows = parseUnitedIndiaRegister(text);
    console.log(`\n✅ Parsing successful! Found ${rows.length} policies\n`);
    
    if (rows.length === 0) {
      console.warn('⚠️  No policies were extracted!');
      console.log('\nDebugging: Looking for policy patterns...');
      
      // Check for policy numbers in text
      const policyNumbers = text.match(/\d+[A-Z]\d+/g);
      console.log(`Found ${policyNumbers?.length || 0} potential policy numbers`);
      if (policyNumbers) {
        console.log('First 5:', policyNumbers.slice(0, 5));
      }
      
      // Check for the pattern the parser uses
      const policyPattern = /^(\d{1,3})\s+(\d{6})\s+(\d{7})\s+(\d+[A-Z]\d+)/gm;
      const matches = text.match(policyPattern);
      console.log(`Pattern matches: ${matches?.length || 0}`);
      if (matches) {
        console.log('First match:', matches[0]);
      }
    } else {
      console.log('=== Extracted Policies ===\n');
      rows.forEach((row, idx) => {
        console.log(`Policy ${idx + 1}:`);
        console.log(`  S.No: ${row.sn}`);
        console.log(`  Client Name: ${row.client_name}`);
        console.log(`  Policy Number: ${row.policy_number}`);
        console.log(`  Policy Type: ${row.policy_type}`);
        console.log(`  Company: ${row.company}`);
        console.log(`  Product: ${row.product_name}`);
        console.log(`  Start Date: ${row.start_date}`);
        console.log(`  Renewal Date: ${row.renewal_date}`);
        console.log(`  Sum Insured: ${row.sum_insured}`);
        console.log(`  Premium: ${row.premium}`);
        console.log('');
      });
      
      console.log('\n✅ Register parser is working correctly!');
    }
  } catch (err: any) {
    console.error('\n❌ Parsing failed:', err.message);
    console.error(err.stack);
  }
}

testRegisterParser().catch(console.error);
