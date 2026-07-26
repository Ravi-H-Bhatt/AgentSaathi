/**
 * Test United India parser with the actual PDF text
 */
import { parseUnitedIndiaText } from './src/lib/unitedindia';

const testText = `
Office Copy
United India Insurance Company Limited
Registered Office: 24 Whites Road, Chennai, 600 0 14
IRDAI Reg. No 545
Website: http://www.uiic.co.in
23rd Jun, 2026

INDIVIDUAL HEALTH INSURANCE POLICY SCHEDULE

Dear MRS PATEL MADAKINI K

YOUR POLICY No. 0605002825P118453056

POLICY DETAILS
Policyholder Name : MRS PATEL MADAKINI K
Policyholder ID : 1292830906
Policy No. : 0605002825P118453056
Previous Policy No. : 0605002824P117792076
Period of Insurance : From 12:00 hrs of 26/02/2026 To Midnight on 25/02/2027

YOUR CONTACT INFORMATION
Address : 76 SARDAR KUNJ SOCTY SAHAPUR BAICENTRE DIST. : AHMADABAD, GUJARAT
AHMADABAD 
GUJARAT-380004

DETAILS OF INSURED PERSONS
Insured Name DOB & Age/Gender ABHA ID Relation Occupation Nominee Name Nominee Relation PEDs' declared Inception Date of first policy
PATEL MANDAKINI K 01/06/1951 & 74/F Self Unemployed SUDHABEN Sister None 23/02/2011

SUMMARY OF COVERAGE
Insured Name Plan Sum Insured( ) Domiciliary Hospitalisation Limit( ) Daily Cash Cover
PATEL MANDAKINI K Gold 200,000.00 35,000.00 Not Opted

PREMIUM BREAK DOWN
Insured Name Base Cover Premium( ) Optional Cover Premium( ) Loading for PEDs'( ) Family Discount( ) Direct Channel Discount( ) Total Annual Premium( )
PATEL MANDAKINI K 24,367.00 0.00 0.00 0.00 0.00 24,367.00

PAYMENT DETAILS
Total Basic Premium 24,367.00 Premium 24,367.00
Road Ambulance Premium 0.00 CGST(0%) 0.00
Daily Cash Premium 0.00 SGST(0%) 0.00
Add PED Loading 0.00 UTGST(0%) 0.00
Less Family Discount 0.00 IGST(0%) 0.00
Less No Claim Discount 0 Stamp duty 1.00
Less Direct Channel Discount 0.00 Total 24,367.00
Less Online Discount 0.00
Premium 24,367.00
`;

try {
  console.log('Testing United India parser...\n');
  const result = parseUnitedIndiaText(testText);
  console.log('Extraction result:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Parser error:', error);
}
