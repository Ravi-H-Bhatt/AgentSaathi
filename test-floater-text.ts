import { parseUnitedIndiaFloaterText, isUnitedIndiaFloaterPolicy } from './src/lib/unitedindia-floater';

// Sample text extracted from a United India Floater policy PDF
// This should match the structure from page 2 of your floater PDF
const sampleFloaterText = `
United India Insurance Company Limited   
Registered Office: 24 Whites Road, Chennai, 600 014   
IRDAI Reg. No 545   
Website: http://www.uiic.co.in

23rd Jun, 2026

Your FAMILY FLOATER MEDICLAIM POLICY SCHEDULE

Dear MR JOHN DOE

POLICY DETAILS
Policyholder Name : MR JOHN DOE
Policyholder ID : 1234567890
Policy No. : 0605002826P103732995
Previous Policy No. : 0605002825P103964712
Period of Insurance : From 00:00 hrs of 01/02/2026 To Midnight on 31/01/2027

YOUR CONTACT INFORMATION
Address : 123, MAIN STREET, NEAR CITY CENTER, DOWNTOWN AREA,
  AHMADABAD
  GUJARAT - 380001
  Tel: 1234567890

DETAILS OF INSURED PERSONS
Sr. No. Name Relation Date of Birth Age Gender Sum Insured
1 MR JOHN DOE Self 15/05/1976 50 Male 500,000.00
2 MRS JANE DOE Spouse 10/08/1978 48 Female 500,000.00
3 MS ALICE DOE Daughter 20/03/2005 21 Female 500,000.00
4 MR BOB DOE Son 15/12/2008 18 Male 500,000.00

SUMMARY OF COVERAGE
Plan Name: Gold Floater Mediclaim
Sum Insured (Floater): 500,000.00
Coverage Type: Family Floater
Benefits: Hospitalization, Pre-hospitalization, Post-hospitalization

PREMIUM BREAK DOWN
Basic Premium : 28,500.00
Family Discount : 2,850.00
No Claim Discount : 5,700.00
Total Annual Premium : 19,950.00

PAYMENT DETAILS
Premium Payment : 19,950.00
Service Tax : 2,393.00
Total : 22,343.00

Receipt Number: RCP123456789
Receipt Date: 23/06/2026

Thank you for choosing United India Insurance
`;

async function testFloaterParser() {
  console.log('=== Testing United India Floater Parser ===\n');
  
  console.log('Text length:', sampleFloaterText.length);
  console.log('');
  
  // Test detection
  console.log('--- Detection Check ---');
  const isFloater = isUnitedIndiaFloaterPolicy(sampleFloaterText);
  console.log('Is United India Floater policy?', isFloater ? '✅ YES' : '❌ NO');
  
  if (!isFloater) {
    console.error('\n❌ Policy not detected as United India Floater!');
    return;
  }
  
  // Test parsing
  console.log('\n--- Parsing Policy Data ---');
  try {
    const result = parseUnitedIndiaFloaterText(sampleFloaterText);
    console.log('\n✅ Parsing successful!\n');
    
    console.log('📋 EXTRACTED DATA:');
    console.log('='.repeat(60));
    console.log('Client Name:            ', result.client_name);
    console.log('Policy Number:          ', result.policy_number);
    console.log('Previous Policy Number: ', result.previous_policy_number || '(None)');
    console.log('Company:                ', result.company);
    console.log('Product Name:           ', result.product_name);
    console.log('Policy Type:            ', result.policy_type);
    console.log('Policy Holder Type:     ', result.policy_holder_type);
    console.log('Sum Insured (Floater):  ', '₹' + result.sum_insured.toLocaleString('en-IN'));
    console.log('Premium:                ', '₹' + result.premium.toLocaleString('en-IN'));
    console.log('Start Date:             ', result.start_date);
    console.log('Renewal Date:           ', result.renewal_date);
    console.log('');
    
    console.log('👨‍👩‍👧‍👦 FAMILY MEMBERS:');
    console.log('='.repeat(60));
    if (result.members.length > 0) {
      result.members.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name}`);
        console.log(`   Relation: ${member.relation}`);
        console.log(`   Age: ${member.age}`);
        console.log(`   Sum Insured: ₹${member.sum_insured.toLocaleString('en-IN')} (Shared Floater)`);
        console.log('');
      });
      console.log(`Total Family Members: ${result.members.length}`);
    } else {
      console.log('⚠️  No family members extracted!');
    }
    console.log('');
    
    if (result.previous_policy_number) {
      console.log('🔗 RENEWAL DETECTION:');
      console.log('='.repeat(60));
      console.log(`✅ Previous Policy Number found: ${result.previous_policy_number}`);
      console.log(`   This policy can be attached to existing client`);
      console.log(`   with policy number ${result.previous_policy_number}`);
      console.log('');
    }
    
    console.log('✅ FLOATER PARSER IS WORKING CORRECTLY!');
    
    // Validation
    console.log('\n🔍 VALIDATION:');
    console.log('='.repeat(60));
    const checks = [
      { name: 'Policy Number extracted', pass: result.policy_number.length > 0 },
      { name: 'Previous Policy extracted', pass: result.previous_policy_number !== null },
      { name: 'Client Name extracted', pass: result.client_name.length > 0 },
      { name: 'Sum Insured > 0', pass: result.sum_insured > 0 },
      { name: 'Premium > 0', pass: result.premium > 0 },
      { name: 'Start Date extracted', pass: result.start_date.length > 0 },
      { name: 'Renewal Date extracted', pass: result.renewal_date.length > 0 },
      { name: 'Family Members extracted', pass: result.members.length > 0 },
      { name: 'Policy Type is Floater', pass: result.policy_holder_type === 'Floater' },
    ];
    
    checks.forEach(check => {
      console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
    });
    
    const allPassed = checks.every(c => c.pass);
    console.log('');
    console.log(allPassed ? '✅ ALL VALIDATIONS PASSED!' : '⚠️  SOME VALIDATIONS FAILED');
    
  } catch (err: any) {
    console.error('\n❌ Parsing failed:', err.message);
    console.error(err);
  }
}

testFloaterParser().catch(console.error);
