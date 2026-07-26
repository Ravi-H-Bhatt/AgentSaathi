/**
 * Simple test for United India Floater Parser
 * Uses pdfjs-dist directly to avoid server-only issues
 */

import { readFileSync } from 'fs';
import { parseUnitedIndiaFloaterText, isUnitedIndiaFloaterPolicy } from './src/lib/unitedindia-floater';

// Simple PDF text extraction using pdfjs-dist
async function extractText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

async function testFloaterParser() {
  try {
    const pdfPath = process.argv[2];
    
    if (!pdfPath) {
      console.error('❌ Usage: npx tsx test-floater-simple.ts <path-to-floater-pdf>');
      process.exit(1);
    }
    
    console.log('📄 Testing United India Floater Parser');
    console.log('━'.repeat(60));
    console.log(`PDF: ${pdfPath}`);
    console.log('');
    
    const pdfBuffer = readFileSync(pdfPath);
    console.log('✅ PDF loaded');
    
    const text = await extractText(pdfBuffer);
    console.log(`✅ Text extracted (${text.length} characters)`);
    console.log('');
    
    const isFloater = isUnitedIndiaFloaterPolicy(text);
    console.log(`🔍 Is Floater Policy: ${isFloater ? '✅ YES' : '❌ NO'}`);
    
    if (!isFloater) {
      console.log('');
      console.log('⚠️  Not a United India Floater policy');
      console.log('');
      console.log('First 500 characters:');
      console.log('─'.repeat(60));
      console.log(text.substring(0, 500));
      console.log('─'.repeat(60));
      process.exit(1);
    }
    
    console.log('');
    console.log('🔧 Parsing policy data...');
    console.log('');
    
    const extracted = parseUnitedIndiaFloaterText(text);
    
    console.log('✅ EXTRACTION SUCCESSFUL');
    console.log('━'.repeat(60));
    console.log('');
    
    console.log('📋 POLICY DETAILS:');
    console.log('─'.repeat(60));
    console.log(`Policy Number:          ${extracted.policy_number}`);
    console.log(`Previous Policy Number: ${extracted.previous_policy_number || '(None)'}`);
    console.log(`Client Name:            ${extracted.client_name}`);
    console.log(`Product Name:           ${extracted.product_name}`);
    console.log(`Policy Holder Type:     ${extracted.policy_holder_type}`);
    console.log('');
    
    console.log('💰 FINANCIAL:');
    console.log('─'.repeat(60));
    console.log(`Sum Insured: ₹${extracted.sum_insured.toLocaleString('en-IN')}`);
    console.log(`Premium:     ₹${extracted.premium.toLocaleString('en-IN')}`);
    console.log('');
    
    console.log('📅 DATES:');
    console.log('─'.repeat(60));
    console.log(`Start:   ${extracted.start_date}`);
    console.log(`Renewal: ${extracted.renewal_date}`);
    console.log('');
    
    if (extracted.client_address) {
      console.log('📍 ADDRESS:');
      console.log('─'.repeat(60));
      console.log(extracted.client_address);
      console.log('');
    }
    
    console.log('👨‍👩‍👧‍👦 FAMILY MEMBERS:');
    console.log('─'.repeat(60));
    if (extracted.members.length > 0) {
      extracted.members.forEach((m, i) => {
        console.log(`${i + 1}. ${m.name} (${m.relation}, Age: ${m.age})`);
      });
      console.log(`\nTotal: ${extracted.members.length} members`);
    } else {
      console.log('⚠️  No members extracted!');
    }
    console.log('');
    
    if (extracted.previous_policy_number) {
      console.log('🔗 RENEWAL DETECTION:');
      console.log('─'.repeat(60));
      console.log(`✅ Previous Policy: ${extracted.previous_policy_number}`);
      console.log(`   Can attach to existing client with this policy number`);
      console.log('');
    }
    
    console.log('✅ TEST COMPLETED');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

testFloaterParser();
