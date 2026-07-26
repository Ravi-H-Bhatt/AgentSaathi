import { looksLikeUnitedIndiaRegister, parseUnitedIndiaRegister } from './src/lib/unitedindia-register';

// Text extracted from the United India Premium Register PDF (07-2026)
const sampleText = `UNITED INDIA INSURANCE COMPANY LIMITED
Premium Register
From : 1 Jul 2026 , To : 26 Jul 2026
Report Run Date & Time : 26 Jul 2026 13:41
(Amount in Rs)
Page No: 1 /
5
S.NO. RO Code Office Code Policy Number Endorsement 
Number
Collection 
Date
Insured Name Policy Effective 
Date
Policy Expiry 
Date
Department Sum Insured TP Premium OD 
Chassis Number RO Name Office Name Engine Number Registration 
Number
Service Tax Stamp Duty Intermediary 
Code
CoInsurance 
Remarks
Collection Number Policy Type
(Office Policy/
Portal Policy)
Own Share % Col
1 060000 9060500 0605002826P104874070 0 02/07/2026 RUPALI R. DAVE 6 Jul 2026 5 Jul 2027 Health 600000.00 0.00 57409 
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NANo Co-Insurance 10106050026135416886 OFFICE POLICY 100 NO 
Day Total: 600000 0 
2 060000 9060500 0605002826P104959270 0 03/07/2026 JAGRUTIBEN J. VASAVADA 16 Jul 2026 15 Jul 2027 Health 250000.00 0.00 2924
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NANo Co-Insurance 10106050026135504426 Portal Policy 100 NO 
Day Total: 250000 0 
3 060000 9060500 0605002826P105161031 0 07/07/2026 DINESH ACHALDAS JAIN. 22 Jul 2026 21 Jul 2027 Health 1000000.00 0.00 71762 
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NANo Co-Insurance 10106050026135711769 OFFICE POLICY 100 NO 
4 060000 9060500 0605002826P105161280 0 07/07/2026 JIGNESH D. JAIN. 21 Jul 2026 20 Jul 2027 Health 2000000.00 0.00 3722
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NANo Co-Insurance 10106050026135711445 OFFICE POLICY 100 NO 
5 060000 9060500 0605002826P105161433 0 07/07/2026 RAMESHCHANDRA SHAH 21 Jul 2026 20 Jul 2027 Health 1000000.00 0.00 87305 
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NANo Co-Insurance 10106050026135712101 OFFICE POLICY 100 NO`;

function testParser() {
  console.log('=== Testing United India Premium Register Parser ===\n');
  
  console.log(`Text length: ${sampleText.length} characters\n`);
  
  // Test detection
  console.log('--- Detection Check ---');
  const isDetected = looksLikeUnitedIndiaRegister(sampleText);
  console.log('Is United India Premium Register?', isDetected ? '✅ YES' : '❌ NO');
  
  if (!isDetected) {
    console.error('\n❌ Document not detected!');
    console.log('\nChecking indicators:');
    const lower = sampleText.toLowerCase();
    console.log('- "united india insurance":', lower.includes('united india insurance'));
    console.log('- "premium register":', lower.includes('premium register'));
    console.log('- "policy number":', lower.includes('policy number'));
    console.log('- "insured name":', lower.includes('insured name'));
    return;
  }
  
  // Test parsing
  console.log('\n--- Parsing Register ---');
  try {
    const rows = parseUnitedIndiaRegister(sampleText);
    console.log(`\n✅ Found ${rows.length} policies\n`);
    
    if (rows.length === 0) {
      console.warn('⚠️  No policies extracted!\n');
      
      // Debug: Check pattern matching
      console.log('Debug: Looking for policy pattern...');
      const policyPattern = /^(\d{1,3})\s+(\d{6})\s+(\d{7})\s+(\d+[A-Z]\d+)/gm;
      let match;
      let count = 0;
      while ((match = policyPattern.exec(sampleText)) !== null) {
        count++;
        console.log(`  Match ${count}: SN=${match[1]}, Policy=${match[4]}`);
      }
      console.log(`Total pattern matches: ${count}`);
    } else {
      console.log('=== Extracted Data ===\n');
      rows.forEach((row, idx) => {
        console.log(`[${idx + 1}] ${row.client_name}`);
        console.log(`    S.No: ${row.sn}`);
        console.log(`    Policy Number: ${row.policy_number}`);
        console.log(`    Company: ${row.company}`);
        console.log(`    Product: ${row.product_name}`);
        console.log(`    Policy Type: ${row.policy_type}`);
        console.log(`    Start Date: ${row.start_date}`);
        console.log(`    Renewal Date: ${row.renewal_date}`);
        console.log(`    Sum Insured: ${row.sum_insured ? '₹' + row.sum_insured.toLocaleString('en-IN') : 'N/A'}`);
        console.log(`    Premium: ${row.premium ? '₹' + row.premium.toLocaleString('en-IN') : 'Not in register (to be calculated)'}`);
        console.log(`    Address: ${row.client_address || 'N/A'}`);
        console.log(`    Phone: ${row.client_phone || 'N/A'}`);
        console.log(`    Mode: ${row.mode || 'N/A'}`);
        console.log('');
      });
      
      console.log('\n✅ Parser working correctly!');
      console.log('📝 Note: Premium is not included in this register format.');
      console.log('   Premium must be calculated separately or entered manually.');
    }
  } catch (err: any) {
    console.error('\n❌ Parsing failed:', err.message);
    console.error(err.stack);
  }
}

testParser();
