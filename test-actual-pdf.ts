/**
 * Test with the ACTUAL PDF file
 */
import * as fs from 'fs';
import { looksLikeUnitedIndiaRegister, parseUnitedIndiaRegister } from './src/lib/unitedindia-register';
import { parseRegisterAuto } from './src/lib/register';

// Extract text using unpdf (same as the app uses)
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n") : text;
  return (merged ?? "").trim();
}

async function testActualPDF() {
  const pdfPath = '07-2026.pdf';
  
  console.log('=== Testing with ACTUAL PDF ===\n');
  console.log(`📄 File: ${pdfPath}\n`);
  
  // Read PDF
  const dataBuffer = fs.readFileSync(pdfPath);
  console.log(`✅ File size: ${dataBuffer.length} bytes\n`);
  
  // Extract text
  console.log('Extracting text from PDF...');
  const text = await extractPdfText(dataBuffer);
  
  console.log(`✅ Extracted ${text.length} characters\n`);
  
  // Show first 2000 chars
  console.log('--- First 2000 characters ---');
  console.log(text.substring(0, 2000));
  console.log('...\n');
  
  // Show lines around policy entries
  console.log('--- Lines containing policy numbers ---');
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    if (/\d+[A-Z]\d+/.test(line) && line.includes('060000')) {
      console.log(`Line ${idx}: ${line.substring(0, 200)}`);
    }
  });
  console.log('');
  
  // Test detection
  console.log('--- DETECTION TEST ---');
  const detected = looksLikeUnitedIndiaRegister(text);
  console.log(`United India Register detected: ${detected ? '✅ YES' : '❌ NO'}\n`);
  
  if (!detected) {
    console.log('Checking detection criteria:');
    const lower = text.toLowerCase();
    console.log('  - "united india insurance":', lower.includes('united india insurance'));
    console.log('  - "premium register":', lower.includes('premium register'));
    console.log('  - "policy number":', lower.includes('policy number'));
    console.log('  - "insured name":', lower.includes('insured name'));
    console.log('');
  }
  
  // Test auto-detection via parseRegisterAuto
  console.log('--- AUTO-DETECTION TEST (parseRegisterAuto) ---');
  const { rows, type, confidence } = await parseRegisterAuto(text, dataBuffer);
  console.log(`Type: ${type}`);
  console.log(`Confidence: ${confidence}`);
  console.log(`Rows: ${rows.length}\n`);
  
  if (rows.length > 0) {
    console.log('✅ SUCCESS! Policies extracted:\n');
    rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.client_name}`);
      console.log(`   Policy: ${row.policy_number}`);
      console.log(`   Company: ${row.company}`);
      console.log(`   Dates: ${row.start_date} → ${row.renewal_date}`);
      console.log(`   Sum Insured: ₹${row.sum_insured?.toLocaleString('en-IN')}`);
      console.log('');
    });
  } else {
    console.log('❌ FAILED: No policies extracted');
    console.log('\nTrying direct parser...');
    const directRows = parseUnitedIndiaRegister(text);
    console.log(`Direct parser result: ${directRows.length} policies`);
  }
}

testActualPDF().catch(console.error);
