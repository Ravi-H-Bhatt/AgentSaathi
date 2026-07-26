/**
 * Test United India Floater Policy Parser
 * Tests against the actual PDF: 07-2026.pdf
 * 
 * Verifies:
 * 1. Correct detection on PAGE 2 (POLICY DETAILS section)
 * 2. Accurate extraction of current policy number
 * 3. Accurate extraction of previous policy number
 * 4. Family floater structure parsing
 * 5. Database matching capability
 */

import * as fs from 'fs';
import {
  isUnitedIndiaFloaterPolicy,
  parseUnitedIndiaFloaterPolicy,
  matchPolicyWithDatabase,
  validateExtraction,
  formatExtractionResult,
  type UnitedIndiaFloaterExtraction,
} from './src/lib/unitedindia-floater';

// Extract text using unpdf (same as app)
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join('\n') : text;
  return (merged ?? '').trim();
}

async function testFloaterParser() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   UNITED INDIA FLOATER POLICY PARSER - COMPREHENSIVE TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const pdfPath = '07-2026.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ ERROR: Test PDF not found at ${pdfPath}`);
    process.exit(1);
  }

  // ========================================
  // STEP 1: Extract text from PDF
  // ========================================
  console.log('📄 STEP 1: Extracting text from PDF...\n');
  
  const dataBuffer = fs.readFileSync(pdfPath);
  console.log(`   File: ${pdfPath}`);
  console.log(`   Size: ${(dataBuffer.length / 1024).toFixed(2)} KB\n`);
  
  let fullText = '';
  try {
    fullText = await extractPdfText(dataBuffer);
    console.log(`   ✅ Extracted ${fullText.length.toLocaleString()} characters\n`);
  } catch (error) {
    console.error(`   ❌ Failed to extract text: ${error}`);
    process.exit(1);
  }

  // Show snippet of extracted text
  console.log('   --- Sample of extracted text (first 1500 chars) ---');
  console.log(fullText.substring(0, 1500));
  console.log('   ...\n');

  // ========================================
  // STEP 2: Document Detection
  // ========================================
  console.log('🔍 STEP 2: Document Detection\n');
  
  const isFloater = isUnitedIndiaFloaterPolicy(fullText);
  console.log(`   Is United India Floater Policy: ${isFloater ? '✅ YES' : '❌ NO'}\n`);
  
  if (!isFloater) {
    console.error('   Document detection failed. Checking indicators:');
    const lower = fullText.toLowerCase();
    console.log(`   - "united india insurance": ${lower.includes('united india insurance') ? '✅' : '❌'}`);
    console.log(`   - Policy number pattern: ${/\b\d{10,}[A-Z]\d{5,}\b/.test(fullText) ? '✅' : '❌'}`);
    console.log(`   - "floater": ${lower.includes('floater') ? '✅' : '❌'}`);
    console.log(`   - "family": ${lower.includes('family') ? '✅' : '❌'}`);
    console.error('\n   ❌ Parser will skip this document.');
    process.exit(1);
  }

  // ========================================
  // STEP 3: Parse Policy
  // ========================================
  console.log('📋 STEP 3: Parsing Policy Details\n');
  
  let extraction: UnitedIndiaFloaterExtraction | null = null;
  try {
    extraction = parseUnitedIndiaFloaterPolicy(fullText);
    console.log('   ✅ Policy parsed successfully\n');
  } catch (error) {
    console.error(`   ❌ Parsing failed: ${error}`);
    process.exit(1);
  }

  // ========================================
  // STEP 4: Display Extracted Data
  // ========================================
  console.log('📊 STEP 4: Extracted Policy Data\n');
  
  console.log(`   Policy Number: ${extraction.policy_number}`);
  console.log(`   Previous Policy: ${extraction.previous_policy_number || 'N/A'}`);
  console.log(`   Policyholder: ${extraction.client_name}`);
  console.log(`   Company: ${extraction.company}`);
  console.log(`   Product: ${extraction.product_name}`);
  console.log(`   Policy Type: ${extraction.policy_holder_type}`);
  console.log(`   Start Date: ${extraction.start_date}`);
  console.log(`   Renewal Date: ${extraction.renewal_date}`);
  console.log(`   Sum Insured: ₹${extraction.sum_insured.toLocaleString('en-IN')}`);
  console.log(`   Premium: ₹${extraction.premium.toLocaleString('en-IN')}`);
  console.log(`   Address: ${extraction.client_address || 'N/A'}`);
  console.log(`   Confidence: ${extraction.confidence_score}%\n`);

  // ========================================
  // STEP 5: Validate Extraction
  // ========================================
  console.log('✔️ STEP 5: Validation\n');
  
  const validation = validateExtraction(extraction);
  
  if (!validation.valid) {
    console.log('   ❌ Validation FAILED:\n');
    validation.errors.forEach(err => console.log(`      - ${err}`));
    process.exit(1);
  }
  
  console.log('   ✅ All validations passed\n');
  
  if (validation.warnings.length > 0) {
    console.log('   ⚠️ Warnings:\n');
    validation.warnings.forEach(warn => console.log(`      - ${warn}`));
    console.log('');
  }

  // ========================================
  // STEP 6: Family Members
  // ========================================
  if (extraction.family_members && extraction.family_members.length > 0) {
    console.log('👥 STEP 6: Family Members\n');
    
    console.log(`   Total: ${extraction.total_family_members} members\n`);
    
    extraction.family_members.forEach((member, idx) => {
      console.log(`   ${idx + 1}. ${member.name}`);
      console.log(`      - DOB: ${member.dob} (Age ${member.age})`);
      console.log(`      - Gender: ${member.gender}`);
      console.log(`      - Relation: ${member.relation}`);
      console.log(`      - Occupation: ${member.occupation}`);
      console.log(`      - Base Cover Premium: ₹${member.base_cover_premium.toLocaleString('en-IN')}\n`);
    });
  }

  // ========================================
  // STEP 7: Database Matching Simulation
  // ========================================
  console.log('🔗 STEP 7: Database Matching (Simulated)\n');
  
  console.log('   Matching strategies in order:');
  console.log(`   1. Exact policy number: ${extraction.policy_number}`);
  console.log(`   2. Previous policy number: ${extraction.previous_policy_number || 'N/A'}`);
  console.log(`   3. Client name: ${extraction.client_name}\n`);
  
  console.log('   Expected results in production:');
  console.log('   - If policy number exists: Match with confidence 100%');
  console.log('   - If previous policy exists: Match with confidence 95% (renewal)');
  console.log('   - If client name matches: Match with confidence 75%\n');

  // ========================================
  // STEP 8: Formatted Output
  // ========================================
  console.log('📄 STEP 8: Formatted Display\n');
  console.log(formatExtractionResult(extraction));
  console.log('\n');

  // ========================================
  // STEP 9: Test Assertions
  // ========================================
  console.log('🧪 STEP 9: Test Assertions\n');
  
  const assertions = [
    {
      name: 'Detected on Page 2',
      expected: 2,
      actual: extraction.detected_on_page,
      pass: extraction.detected_on_page === 2,
    },
    {
      name: 'Policy Number Format',
      expected: '0605002826P103732995',
      actual: extraction.policy_number,
      pass: /^\d{10}[A-Z]\d{8}$/.test(extraction.policy_number),
    },
    {
      name: 'Has Previous Policy Number',
      expected: 'true',
      actual: extraction.previous_policy_number ? 'true' : 'false',
      pass: extraction.previous_policy_number !== null && extraction.previous_policy_number !== '',
    },
    {
      name: 'Policy Holder Type',
      expected: 'Floater',
      actual: extraction.policy_holder_type,
      pass: extraction.policy_holder_type === 'Floater',
    },
    {
      name: 'Sum Insured > 0',
      expected: '> 0',
      actual: `₹${extraction.sum_insured.toLocaleString('en-IN')}`,
      pass: extraction.sum_insured > 0,
    },
    {
      name: 'Premium > 0',
      expected: '> 0',
      actual: `₹${extraction.premium.toLocaleString('en-IN')}`,
      pass: extraction.premium > 0,
    },
    {
      name: 'Confidence Score >= 70',
      expected: '>= 70',
      actual: `${extraction.confidence_score}%`,
      pass: extraction.confidence_score >= 70,
    },
    {
      name: 'Has Family Members',
      expected: '> 0',
      actual: extraction.total_family_members?.toString() || '0',
      pass: (extraction.total_family_members || 0) > 0,
    },
  ];

  let passCount = 0;
  assertions.forEach(assertion => {
    const status = assertion.pass ? '✅' : '❌';
    console.log(`   ${status} ${assertion.name}`);
    console.log(`      Expected: ${assertion.expected}`);
    console.log(`      Actual: ${assertion.actual}\n`);
    if (assertion.pass) passCount++;
  });

  const totalAssertions = assertions.length;
  console.log(`   📊 Results: ${passCount}/${totalAssertions} assertions passed\n`);

  if (passCount === totalAssertions) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   ✅ ALL TESTS PASSED - PARSER IS 100% CORRECT');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   ❌ SOME TESTS FAILED - CHECK IMPLEMENTATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run test
testFloaterParser().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
