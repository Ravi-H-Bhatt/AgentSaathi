import * as fs from 'fs';
import { extractText, getDocumentProxy } from 'unpdf';

async function extractFamilyPolicy() {
  console.log('\n🔍 EXTRACTING FAMILY POLICY FROM REGISTER\n');

  const buffer = fs.readFileSync('07-2026.pdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const fullText = (Array.isArray(text) ? text.join('\n') : text ?? '').trim();

  console.log('📄 Full text from PDF:\n');
  console.log(fullText);
  console.log('\n\n=== ANALYSIS ===\n');

  // This is a premium register, extract all policies
  const lines = fullText.split('\n');
  
  console.log('All policy numbers found:');
  const policyMatches = fullText.match(/0605002826P\d{8}/g);
  if (policyMatches) {
    [...new Set(policyMatches)].forEach((policy, idx) => {
      console.log(`  ${idx + 1}. ${policy}`);
    });
  }

  // Look for the policy with "BHAWESHKUMAR" mentioned in the document you shared
  console.log('\n\nSearching for BHAWESHKUMAR policy...');
  if (fullText.includes('BHAWESHKUMAR')) {
    console.log('✅ Found BHAWESHKUMAR in document');
    const idx = fullText.indexOf('BHAWESHKUMAR');
    console.log('Context:', fullText.substring(Math.max(0, idx - 200), idx + 200));
  } else {
    console.log('❌ BHAWESHKUMAR not found in this register');
  }

  // The document you provided is on page 2 of the PDF attachment
  // Look for the specific policy format
  console.log('\n\nLooking for Family Floater structure...');
  if (fullText.includes('Family Floater') || fullText.includes('FAMILY')) {
    console.log('✅ Family/Floater mentioned');
  } else {
    console.log('❌ No Family/Floater mention in this file');
  }
}

extractFamilyPolicy().catch(console.error);
