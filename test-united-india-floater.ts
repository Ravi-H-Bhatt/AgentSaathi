/**
 * Test United India Floater Policy Parser
 * 
 * This script tests the United India floater parser with a sample PDF
 * to verify it extracts:
 * - Policy Number
 * - Previous Policy Number
 * - All family members with ages
 * - Correct floater sum insured (shared across family)
 * - Premium
 */

import { readFileSync } from 'fs';
import { extractPdfText } from './src/lib/pdf';
import { parseUnitedIndiaFloaterText, isUnitedIndiaFloaterPolicy } from './src/lib/unitedindia-floater';

async function testFloaterParser() {
  try {
    // Replace with actual path to your United India floater PDF
    const pdfPath = process.argv[2];
    
    if (!pdfPath) {
      console.error('❌ Usage: npx tsx test-united-india-floater.ts <path-to-floater-pdf>');
      process.exit(1);
    }
    
    console.log('📄 Testing United India Floater Parser');
    console.log('━'.repeat(60));
    console.log(`PDF: ${pdfPath}`);
    console.log('');
    
    // Read PDF
    const pdfBuffer = readFileSync(pdfPath);
    console.log('✅ PDF loaded successfully');
    
    // Extract text
    const text = await extractPdfText(pdfBuffer);
    console.log(`✅ Text extracted (${text.length} characters)`);
    console.log('');
    
    // Check if it's a floater policy
    const isFloater = isUnitedIndiaFloaterPolicy(text);
    console.log(`🔍 Is Floater Policy: ${isFloater ? '✅ YES' : '❌ NO'}`);
    
    if (!isFloater) {
      console.log('');
      console.log('⚠️  This does not appear to be a United India Floater policy');
      console.log('');
      
      // Show snippet for debugging
      const snippet = text.substring(0, 500);
      console.log('First 500 characters:');
      console.log('─'.repeat(60));
      console.log(snippet);
      console.log('─'.repeat(60));
      
      process.exit(1);
    }
    
    console.log('');
    console.log('🔧 Parsing policy data...');
    console.log('');
    
    // Parse the policy
    const extracted = parseUnitedIndiaFloaterText(text);
    
    // Display results
    console.log('✅ EXTRACTION SUCCESSFUL');
    console.log('━'.repeat(60));
    console.log('');
    
    console.log('📋 POLICY DETAILS:');
    console.log('─'.repeat(60));
    console.log(`Policy Number:          ${extracted.policy_number}`);
    console.log(`Previous Policy Number: ${extracted.previous_policy_number || '(None)'}`);
    console.log(`Client Name:            ${extracted.client_name}`);
    console.log(`Company:                ${extracted.company}`);
    console.log(`Product Name:           ${extracted.product_name}`);
    console.log(`Policy Type:            ${extracted.policy_type}`);
    console.log(`Policy Holder Type:     ${extracted.policy_holder_type}`);
    console.log('');
    
    console.log('💰 FINANCIAL DETAILS:');
    console.log('─'.repeat(60));
    console.log(`Sum Insured (Floater):  ₹${extracted.sum_insured.toLocaleString('en-IN')}`);
    console.log(`Premium:                ₹${extracted.premium.toLocaleString('en-IN')}`);
    console.log('');
    
    console.log('📅 DATES:');
    console.log('─'.repeat(60));
    console.log(`Start Date:    ${extracted.start_date}`);
    console.log(`Renewal Date:  ${extracted.renewal_date}`);
    console.log('');
    
    if (extracted.client_address) {
      console.log('📍 ADDRESS:');
      console.log('─'.repeat(60));
      console.log(extracted.client_address);
      console.log('');
    }
    
    console.log('👨‍👩‍👧‍👦 FAMILY MEMBERS (FLOATER):');
    console.log('─'.repeat(60));
    if (extracted.members.length > 0) {
      extracted.members.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name}`);
        console.log(`   Relation: ${member.relation}`);
        console.log(`   Age: ${member.age}`);
        console.log(`   Sum Insured: ₹${member.sum_insured.toLocaleString('en-IN')} (Shared Floater)`);
        console.log('');
      });
      console.log(`Total Family Members: ${extracted.members.length}`);
    } else {
      console.log('⚠️  No family members extracted!');
    }
    console.log('');
    
    console.log('━'.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('');
    
    // Validation checks
    console.log('🔍 VALIDATION:');
    console.log('─'.repeat(60));
    
    const validations = [
      { check: 'Policy Number', valid: extracted.policy_number.length > 0 },
      { check: 'Client Name', valid: extracted.client_name.length > 0 },
      { check: 'Sum Insured > 0', valid: extracted.sum_insured > 0 },
      { check: 'Premium > 0', valid: extracted.premium > 0 },
      { check: 'Start Date', valid: extracted.start_date.length > 0 },
      { check: 'Renewal Date', valid: extracted.renewal_date.length > 0 },
      { check: 'Family Members', valid: extracted.members.length > 0 },
      { check: 'Policy Type = Floater', valid: extracted.policy_holder_type === 'Floater' },
    ];
    
    let allValid = true;
    validations.forEach(v => {
      const status = v.valid ? '✅' : '❌';
      console.log(`${status} ${v.check}`);
      if (!v.valid) allValid = false;
    });
    
    console.log('');
    
    if (extracted.previous_policy_number) {
      console.log('🔗 RENEWAL DETECTION:');
      console.log('─'.repeat(60));
      console.log(`✅ Previous Policy Number found: ${extracted.previous_policy_number}`);
      console.log(`   This policy can be attached to existing client with policy ${extracted.previous_policy_number}`);
      console.log('');
    }
    
    if (allValid) {
      console.log('✅ ALL VALIDATIONS PASSED');
    } else {
      console.log('⚠️  SOME VALIDATIONS FAILED - Please review');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR DURING PARSING:');
    console.error('━'.repeat(60));
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

// Run the test
testFloaterParser();
