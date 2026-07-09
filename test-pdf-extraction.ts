import fs from 'fs';
import path from 'path';
import { parseNewIndiaRegister, looksLikeNewIndiaRegister } from './src/lib/newindia';

/**
 * Test PDF extraction with the NEW APRIL26 PDF
 * Run: npx tsx test-pdf-extraction.ts
 */

// Simulated PDF text from the document you provided
const pdfText = `THE NEW INDIA ASSURANCE COMPANY LTD.
87, Mahatma Gandhi Road, Fort, Mumbai - 400001
Website: http://www.newindia.co.in
Report Run Time : 09-Jul-2026 13:36:50
Policy Expiry Register Report From 01-Apr-2026 to 30-Apr-2026
Party Code : 1D6335666 Party Name : HARSHAL P BHATT

210600 34 Health Insurance 21060034259500000152: UK New India Mediclaim Policy 05-Apr-2025 04-Apr-2026 H3711577 Mr JAYESH A PARMAR 7 SHRINATH SOCIETY BH GYAN JYOT SCHOOL KK NAGAR ROAD GHATLODIA 380061 8306969250 1D6342095 MANOJ C GILDER 794 1,500,000 50,578 9,104

210600 34 Health Insurance 21060034259500000149: UK New India Mediclaim Policy 05-Apr-2025 04-Apr-2026 H3704382 MR GAURANG L PATEL F 505 ARJUN RATNA APPARTMENTNEAR VARDHMAN APPARTMENT C P NAGAR GHATLODIA GHATLODIA AHMEDABAD GHATLODIA AHMEDABAD 380061 9825060992 1D6342095 MANOJ C GILDER 794 1,500,000 39,947 7,190

210600 34 Health Insurance 21060034252800000101: NP New India Floater Mediclaim Policy 05-Apr-2025 04-Apr-2026 H3688795 Mr KRUNAL ATULKUMAR SHAH B 702 INDRAPRASHTHA 8 NEW SURDHARA CIRCLE THALTEJ AHMEDABAD 380054 9426709257 1D6342095 MANOJ C GILDER 794 800,000 26,735 4,812

210600 48 Misc - Non Traditional Business 21060048250600000003: SH Shopkeepers Insurance 06-Apr-2025 05-Apr-2026 N5569445 JOLLY FASHION FAIR PROPRAMESHBHAI PRAJAPATI A 2 SHALI BHADRA COMPLEX UNDERGROUND AND BASMENT JODHPUR ROAD NR ANUPAM SHOPING CENTRE DIST AHMADABAD 380015 9727582841 1D6342095 MANOJ C GILDER 794 20,558,000 19,885 3,580

210600 11 Fire 21060011258000000005: US Bharat Sookshma Udyam Suraksha 06-Apr-2025 05-Apr-2026 PO20607774 TOPLINE EXIM INC 1002 ABHIJEET II MITHAKHALI SIX ROAD ELLISBRIDGE AHMEDABAD 380006 1D6342095 MANOJ C GILDER 794 30,000,000 47,660 8,578

210600 31 MOTOR 21060031250300000171: PC Private Car 13-Apr-2025 12-Apr-2026 POC1493233 Mr SANDEEP SATISHKUMAR SHAH 48 NIHARIKA BUNGLOWS OPPHIMATLAL PARK AHMEDABAD 380015 8306969250 8306969250 1D6342095 MANOJ C GILDER 794 2,337,579 50,001 9,000 GJ01WB9715

210600 36 Liability Insurance 21060036250400000002: PF Professional Indemnity 13-Apr-2025 12-Apr-2026 PO41056595 DR TARANG HARIBHAI PATEL 322 SARASWATINAGAR 132 FT RING ROAD VASTRAPUR AHMEDABAD 380060 9825022074 1D6342095 MANOJ C GILDER 794 10,500,000 14,700 2,646`;

console.log('='.repeat(80));
console.log('Testing PDF Extraction for NEW APRIL26.pdf');
console.log('='.repeat(80));

// Check if it looks like New India register
const isNewIndia = looksLikeNewIndiaRegister(pdfText);
console.log(`\n✓ Detected as New India Register: ${isNewIndia}`);

if (!isNewIndia) {
  console.log('❌ Failed to detect as New India register!');
  process.exit(1);
}

// Parse the register
console.log('\nParsing policies...\n');
const policies = parseNewIndiaRegister(pdfText);

console.log(`✓ Extracted ${policies.length} policies\n`);

// Display each policy with all fields
policies.forEach((policy, index) => {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`POLICY ${index + 1}:`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`Policy Number:    ${policy.policy_number}`);
  console.log(`Client Name:      ${policy.client_name || '❌ MISSING'}`);
  console.log(`Product Name:     ${policy.product_name || '❌ MISSING'}`);
  console.log(`LOB/Policy Type:  ${policy.policy_type || '❌ MISSING'}`);
  console.log(`Company:          New India Assurance`);
  console.log(`Address:          ${policy.client_address || '❌ MISSING'}`);
  console.log(`Phone:            ${policy.client_phone || 'N/A'}`);
  console.log(`Start Date:       ${policy.start_date || 'N/A'}`);
  console.log(`Renewal Date:     ${policy.renewal_date || 'N/A'}`);
  console.log(`Sum Insured:      ₹${policy.sum_insured?.toLocaleString('en-IN') || 'N/A'}`);
  console.log(`Premium:          ₹${policy.premium?.toLocaleString('en-IN') || 'N/A'}`);
  console.log(`Mode:             ${policy.mode || 'N/A'}`);
});

console.log(`\n${'='.repeat(80)}`);
console.log('VALIDATION SUMMARY');
console.log(`${'='.repeat(80)}`);

// Validation checks
const missingNames = policies.filter(p => !p.client_name).length;
const missingProductNames = policies.filter(p => !p.product_name).length;
const missingPolicyType = policies.filter(p => !p.policy_type).length;
const missingAddress = policies.filter(p => !p.client_address).length;
const missingDates = policies.filter(p => !p.start_date || !p.renewal_date).length;
const missingPremium = policies.filter(p => !p.premium).length;

console.log(`✓ Total Policies:           ${policies.length}`);
console.log(`${missingNames === 0 ? '✓' : '❌'} Missing Client Names:     ${missingNames}`);
console.log(`${missingProductNames === 0 ? '✓' : '❌'} Missing Product Names:    ${missingProductNames}`);
console.log(`${missingPolicyType === 0 ? '✓' : '❌'} Missing LOB/Type:         ${missingPolicyType}`);
console.log(`${missingAddress === 0 ? '✓' : '⚠️ '} Missing Addresses:        ${missingAddress}`);
console.log(`${missingDates === 0 ? '✓' : '❌'} Missing Dates:            ${missingDates}`);
console.log(`${missingPremium === 0 ? '✓' : '❌'} Missing Premiums:         ${missingPremium}`);

console.log(`\n${'='.repeat(80)}`);

// Expected values check
console.log('\nEXPECTED VALUES CHECK:');
console.log(`${'─'.repeat(80)}`);

const checks = [
  {
    name: 'Policy 1: JAYESH A PARMAR',
    test: policies[0]?.client_name?.includes('JAYESH') && !policies[0]?.client_name?.includes('SHRINATH'),
    expected: 'Name only (no address)',
    actual: policies[0]?.client_name
  },
  {
    name: 'Policy 1: Product Name',
    test: policies[0]?.product_name?.includes('Mediclaim'),
    expected: 'New India Mediclaim Policy',
    actual: policies[0]?.product_name
  },
  {
    name: 'Policy 4: JOLLY FASHION FAIR',
    test: policies[3]?.client_name?.includes('JOLLY') && !policies[3]?.client_name?.includes('SHALI'),
    expected: 'Name only (no address)',
    actual: policies[3]?.client_name
  },
  {
    name: 'Policy 4: Shopkeepers Insurance',
    test: policies[3]?.product_name?.includes('Shopkeepers'),
    expected: 'Shopkeepers Insurance',
    actual: policies[3]?.product_name
  },
  {
    name: 'Policy 5: Bharat Sookshma',
    test: policies[4]?.product_name?.includes('Bharat Sookshma'),
    expected: 'Bharat Sookshma Udyam Suraksha',
    actual: policies[4]?.product_name
  },
  {
    name: 'Policy 7: Professional Indemnity',
    test: policies[6]?.product_name?.includes('Professional') || policies[6]?.product_name?.includes('Indemnity'),
    expected: 'Professional Indemnity',
    actual: policies[6]?.product_name
  }
];

checks.forEach(check => {
  console.log(`\n${check.test ? '✓' : '❌'} ${check.name}`);
  console.log(`   Expected: ${check.expected}`);
  console.log(`   Actual:   ${check.actual || '❌ NOT EXTRACTED'}`);
});

console.log(`\n${'='.repeat(80)}\n`);

// Final result
const allPassed = checks.every(c => c.test) && 
                  missingNames === 0 && 
                  missingProductNames === 0 && 
                  missingPolicyType === 0;

if (allPassed) {
  console.log('✓✓✓ ALL CHECKS PASSED! Extraction is working correctly. ✓✓✓\n');
  process.exit(0);
} else {
  console.log('❌❌❌ SOME CHECKS FAILED! Review the output above. ❌❌❌\n');
  process.exit(1);
}
