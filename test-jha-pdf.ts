import { extractPdfText } from './src/lib/pdf';
import { detectUnitedIndiaDocumentType } from './src/lib/unitedindia-detector';
import { parseUnitedIndiaFloaterText } from './src/lib/unitedindia-floater';
import * as fs from 'fs';

async function testJhaPdf() {
  console.log('=== TESTING JHA PDF ===\n');
  
  const jhaPath = '/Users/ravib/Downloads/JHA BHAWESKUMAR RAMESHCHANDRA.pdf';
  const jhaBytes = fs.readFileSync(jhaPath);
  const jhaText = await extractPdfText(jhaBytes);
  
  console.log('--- DETECTION RESULT ---');
  const detection = detectUnitedIndiaDocumentType(jhaText);
  console.log('Type:', detection.type);
  console.log('Confidence:', (detection.confidence * 100).toFixed(0) + '%');
  console.log('Is Register:', detection.isRegister);
  console.log('Policy Count:', detection.policyCount);
  console.log('\nDetails:');
  console.log('  Has Policy Details:', detection.details.hasPolicyDetails);
  console.log('  Has Previous Policy:', detection.details.hasPreviousPolicyField);
  console.log('  Has Family Floater Basis:', detection.details.hasFamilyFloaterBasis);
  console.log('  Has Family Members:', detection.details.hasFamilyMembers);
  console.log('  Policy Numbers Found:', detection.details.policyNumbersFound);
  
  console.log('\n--- TEXT EXCERPT (first 2000 chars) ---');
  console.log(jhaText.slice(0, 2000));
  
  if (detection.type === 'family-floater-policy') {
    console.log('\n--- PARSING WITH FLOATER PARSER ---');
    try {
      const extracted = parseUnitedIndiaFloaterText(jhaText);
      console.log('✅ Parsing successful!');
      console.log('Client Name:', extracted.client_name);
      console.log('Policy Number:', extracted.policy_number);
      console.log('Previous Policy Number:', extracted.previous_policy_number);
      console.log('Product:', extracted.product_name);
      console.log('Sum Insured:', extracted.sum_insured);
      console.log('Premium:', extracted.premium);
      console.log('Members:', extracted.members?.length || 0);
      if (extracted.members && extracted.members.length > 0) {
        extracted.members.forEach(m => console.log(`  - ${m.name} (${m.relation}, ${m.age})`));
      }
    } catch (err) {
      console.error('❌ Parsing failed:', err);
    }
  }
}

testJhaPdf().catch(console.error);
