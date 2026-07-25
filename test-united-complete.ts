/**
 * Complete test for United India PDF upload flow
 * Tests: PDF text extraction → Parser → Matching logic
 */

import * as fs from 'fs';
import { parseUnitedIndiaText } from './src/lib/unitedindia';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testCompleteFlow() {
  console.log('=== COMPLETE UNITED INDIA UPLOAD FLOW TEST ===\n');
  
  const pdfPath = '/Users/ravib/Downloads/JIGNESH RAJENDRAKUMAR SHAH.pdf';
  
  // Step 1: Extract text using Python (since pdf.ts has server-only dependency)
  console.log('Step 1: Extracting text from PDF using Python...');
  const { execSync } = require('child_process');
  
  // Write Python script to temp file
  const pythonScript = `import PyPDF2
pdf = PyPDF2.PdfReader('/Users/ravib/Downloads/JIGNESH RAJENDRAKUMAR SHAH.pdf')
text = ''
for page in pdf.pages:
    text += page.extract_text()
print(text)`;
  
  fs.writeFileSync('/tmp/extract_pdf.py', pythonScript);
  
  let text: string;
  try {
    text = execSync('python3 /tmp/extract_pdf.py', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    console.log('✓ Text extracted, length:', text.length);
  } catch (err) {
    console.error('❌ Failed to extract text:', err);
    return;
  }
  
  // Step 2: Test detection
  console.log('\nStep 2: Testing United India detection...');
  const lowerText = text.toLowerCase();
  const isDetected = lowerText.includes("united india insurance") ||
                     lowerText.includes("uiic.co.in") ||
                     (lowerText.includes("irdai reg") && lowerText.includes("545"));
  
  if (isDetected) {
    console.log('✓ Detected as United India Insurance policy');
  } else {
    console.error('❌ NOT detected as United India policy');
    return;
  }
  
  // Step 3: Parse the policy data
  console.log('\nStep 3: Parsing policy data...');
  let parsedData;
  try {
    parsedData = parseUnitedIndiaText(text);
    console.log('✓ Parsing successful!');
    console.log('\n--- Extracted Data ---');
    console.log('Client Name:', parsedData.client_name);
    console.log('Policy Number:', parsedData.policy_number);
    console.log('Previous Policy Number:', parsedData.previous_policy_number);
    console.log('Company:', parsedData.company);
    console.log('Product Name:', parsedData.product_name);
    console.log('Sum Insured:', parsedData.sum_insured);
    console.log('Premium:', parsedData.premium);
    console.log('Start Date:', parsedData.start_date);
    console.log('Renewal Date:', parsedData.renewal_date);
    console.log('Policy Holder Type:', parsedData.policy_holder_type);
  } catch (err: any) {
    console.error('❌ Parsing failed:', err.message);
    return;
  }
  
  // Step 4: Check database for matches
  console.log('\nStep 4: Checking database for existing policies...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Normalize policy numbers (remove spaces, lowercase)
  const normPolicy = (pn: string | null | undefined): string => {
    if (!pn) return '';
    return pn.replace(/\s+/g, '').toLowerCase();
  };
  
  const currentPolicyNorm = normPolicy(parsedData.policy_number);
  const prevPolicyNorm = normPolicy(parsedData.previous_policy_number);
  
  console.log('Searching for:');
  console.log('  Current policy:', parsedData.policy_number, '→', currentPolicyNorm);
  console.log('  Previous policy:', parsedData.previous_policy_number, '→', prevPolicyNorm);
  
  // Search for matching policies
  const { data: policies, error } = await supabase
    .from('policies')
    .select('id, policy_number, client_id, clients(full_name)')
    .or(`policy_number.ilike.%${currentPolicyNorm}%,policy_number.ilike.%${prevPolicyNorm}%`)
    .limit(10);
  
  if (error) {
    console.error('❌ Database error:', error.message);
  } else if (policies && policies.length > 0) {
    console.log('\n✅ MATCH FOUND!');
    console.log(`Found ${policies.length} matching policies in database:`);
    policies.forEach((p: any) => {
      console.log(`  - Policy #${p.policy_number} (Client: ${p.clients?.full_name})`);
    });
  } else {
    console.log('\n❌ NO MATCH FOUND');
    console.log('This is a new policy - would be created in database');
  }
  
  // Step 5: Explain what would happen in the upload flow
  console.log('\n=== UPLOAD FLOW ANALYSIS ===');
  console.log('\n1. Extract route (api/extract/route.ts) would:');
  console.log('   - Detect this as United India policy ✓');
  console.log('   - Call parseUnitedIndiaText() ✓');
  console.log('   - Return mode: "schedule" (single policy with previous_policy_number)');
  console.log('   - Return registerType: "unitedindia-schedule"');
  
  console.log('\n2. Bulk route (api/policies/bulk/route.ts) would:');
  if (parsedData.previous_policy_number) {
    console.log('   - Detect this row has previous_policy_number ✓');
    console.log('   - Search database for current OR previous policy number');
    if (policies && policies.length > 0) {
      console.log('   - MATCH FOUND → Attach PDF to existing policy');
      console.log('   - Show: "Match found — document attached to the existing policy."');
    } else {
      console.log('   - NO MATCH → Create new policy entry');
      console.log('   - Show: Created count with new policy');
    }
  } else {
    console.log('   - No previous_policy_number → Would create as new policy');
  }
  
  console.log('\n=== CONCLUSION ===');
  if (policies && policies.length > 0) {
    console.log('✅ This PDF SHOULD show "Match Found" when uploaded');
    console.log('   The existing policy will be updated with this PDF attachment');
  } else {
    console.log('❌ This PDF will show as NEW POLICY (no match in database)');
    console.log('   A new policy entry will be created');
  }
}

testCompleteFlow().catch(console.error);
