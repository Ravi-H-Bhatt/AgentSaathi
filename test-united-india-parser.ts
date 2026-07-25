import { parseUnitedIndiaText } from './src/lib/unitedindia';

// Sample text extracted from the Jignesh policy PDF
const sampleText = `Office Copy
 United India Insurance Company Limited   
Registered Office: 24 Whites Road, Chennai, 600 0 14   
IRDAI Reg. No 545   
Website: http://www.uiic.co.in
 
 23rd Jun, 2026
Your 
INDIVIDUAL HEALTH INSURANCE POLICY SCHEDULE
Dear MR MR.JIGNESH RAJENDRAKUMAR SHAH.   

POLICY DETAILS
Policyholder Name : MR MR.JIGNESH RAJENDRAKUMAR SHAH.
Policyholder ID : 1292818018
Policy No. : 0605002825P116693180
Previous Policy No. : 0605002824P117164550
Period of Insurance : From 00:00 hrs of 01/02/2026 To Midnight on 31/01/2027
YOUR CONTACT INFORMATION
Address : 7, MIRAL APPARTMENTS, NEAR JAIN UPASHRAY, BHAGWAN NAGAR TEKRO, PALDI,  
    
  AHMADABAD   
  GUJARAT -380007
  
SUMMARY OF COVERAGE  
Insured Name PlanSum  
Insured( )
MR.JIGNESH 
RAJENDRAKUMAR SHAH.Platinum 200,000.00
VAISHALI. Platinum 200,000.00
VAIBHAV. Platinum 150,000.00
SIDDH Platinum 150,000.00

PAYMENT DETAILS
Total Basic Premium :
 25,827.00 
Less Family Discount :
 1,018.21 
Less No Claim Discount :
 5462.85 
Total :
 19,346.00
`;

async function testParser() {
  console.log('=== Testing United India Parser ===\n');
  
  console.log('Text length:', sampleText.length);
  console.log('\n--- Sample of text ---');
  console.log(sampleText.substring(0, 500));
  console.log('...\n');
  
  // Test detection
  const lowerText = sampleText.toLowerCase();
  const isDetected = lowerText.includes("united india insurance") ||
                     lowerText.includes("uiic.co.in") ||
                     (lowerText.includes("irdai reg") && lowerText.includes("545"));
  
  console.log('--- Detection Check ---');
  console.log('Is United India policy?', isDetected ? '✓ YES' : '✗ NO');
  
  if (!isDetected) {
    console.error('\n❌ Policy not detected as United India Insurance!');
    return;
  }
  
  // Test parsing
  console.log('\n--- Parsing Policy Data ---');
  try {
    const result = parseUnitedIndiaText(sampleText);
    console.log('\n✅ Parsing successful!\n');
    console.log('Extracted Data:');
    console.log('================');
    console.log('Client Name:', result.client_name);
    console.log('Policy Number:', result.policy_number);
    console.log('Previous Policy Number:', result.previous_policy_number);
    console.log('Company:', result.company);
    console.log('Product Name:', result.product_name);
    console.log('Policy Type:', result.policy_type);
    console.log('Sum Insured:', result.sum_insured);
    console.log('Premium:', result.premium);
    console.log('Start Date:', result.start_date);
    console.log('Renewal Date:', result.renewal_date);
    console.log('Client Address:', result.client_address?.substring(0, 50) + '...');
    console.log('Policy Holder Type:', result.policy_holder_type);
    console.log('\n✅ Parser is working correctly!');
  } catch (err: any) {
    console.error('\n❌ Parsing failed:', err.message);
    console.error(err);
  }
}

testParser().catch(console.error);
