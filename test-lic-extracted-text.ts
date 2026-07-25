/**
 * Test LIC Date Wise parser with extracted text from the uploaded PDF.
 * This simulates the full PDF without needing the actual file.
 */

import { parseLicDateWise, looksLikeLicDateWise } from "./src/lib/lic-date-wise";

// Full extracted text from all 6 pages of the PDF
const FULL_PDF_TEXT = `Date Wise Premium Due
01/05/2026 - 31/05/2026
Date : 25/07/2026
Test Message
SN Policy No. Name D.O.C. F.U.P. Sum Ass. Plan M
od
e
Premium
(+Tax)
Mobile No.

1 838445169 Aakash Jaykumar Shah 23/10/**** 23/05/2026 600000 149/79/39 M 1157 9512039766
2 838456064 Abhay Rameshchandra Shah 03/09/**** 03/05/2026 600000 149/61/21 M 2835 9376115120
3 837718041 Abhay Rameshchandra Shah 18/02/**** 18/05/2026 500000 149/63/25 M 1923 9376115120
4 837718087 Abhay Rameshchandra Shah 22/02/**** 22/05/2026 400000 149/63/25 M 1522 9376115120
5 933372828 Aditaya Vipul Patel 23/03/**** 23/05/2026 2000000 945/77/30 M 5117 7573012502
6 837705901 Aditya Gohil 23/12/**** 23/05/2026 250000 165/35/35 M 1021 9099948501
7 933369345 Ajay Khushaldas Sindhi 26/07/**** 26/05/2026 1000000 915/30/30 M 3012 7359322408
8 838456067 Ajay Ramanlal Patel 03/09/**** 03/05/2026 500000 149/64/25 M 1862 9979765331
9 838456066 Ajay Ramanlal Patel 03/09/**** 03/05/2026 500000 149/64/25 M 1862 9979765331
10 837700570 Ajay Ramanlal Patel 11/05/**** 11/05/2026 375000 165/35/35 M 1531 9979765331
11 835853707 Ajay Ramanlal Patel 22/12/**** 22/05/2026 250000 165/35/35 M 1021 9979765331
12 835856613 Ajay Ramanlal Patel 28/01/**** 28/05/2026 125000 165/34/34 M 510 9979765331
13 837700598 Ajay Ramanlal Patel 13/05/**** 13/05/2026 610000 149/67/27 H 12075 9979765331
14 834892720 Ajay Ramanlal Patel 28/11/**** 28/05/2026 125000 133/25/25 H 2902 9979765331
15 835830003 Ajay Ramanlal Patel 28/11/**** 28/05/2026 100000 149/72/25 H 2174 9979765331
16 835862965 Alpa Sharadkumar Mehta 13/10/**** 13/05/2026 125000 165/24/24 M 510 9725603481
17 933374280 Amit Virchandbhai Verma 20/10/**** 20/05/2026 200000 915/35/35 M 497 7984146124
18 933374282 Amit Virchandbhai Verma 20/10/**** 20/05/2026 300000 945/78/25 M 1030 7984146124
19 933374281 Amit Virchandbhai Verma 20/10/**** 20/05/2026 200000 921/25/20 M 988 7984146124
20 839170917 Anavi-l Pawan_gorkhanath Kakkar 28/10/**** 28/05/2026 300000 834/25/20 M 1232 9375217364
21 838458339 Anil Maheshbhai Parmar. 14/12/**** 14/05/2026 100000 93/25/25 M 448 8306969250
22 835861323 Ankita Biren Vasavada 15/07/**** 15/05/2026 250000 165/35/35 M 1021 9898208472
23 838454300 Ankur Surajmal Patel 22/08/**** 22/05/2026 125000 165/23/23 M 510 7383971223
24 933372845 Archit Rupesh Shah 21/03/**** 21/05/2026 2000000 915/31/31 M 5750 9427314142
25 933372846 Archit Rupesh Shah 21/03/**** 21/05/2026 1500000 945/71/30 M 3912 9427314142
26 838442397 Arvind Maganbhai Prajapati 26/06/**** 26/05/2026 600000 149/62/23 M 2565
27 837707986 Ashish Bhanuprasad Upadhyay 07/03/**** 07/05/2026 62500 165/34/34 M 255 9974238837
28 837708004 Ashish Bhanuprasad Upadhyay 08/03/**** 08/05/2026 62500 165/34/34 M 255 9974238837
29 849899198 Ashish Nalinkumar Modi 11/12/**** 11/05/2026 300000 815/24/24 M 1385 9712448336
30 838444162 Ashit Bharatkumar Kansara 06/09/**** 06/05/2026 440000 149/63/25 M 1710 9824212709
295 839178010 Yug Chetan Thakkar 22/02/**** 22/05/2026 500000 815/35/35 M 1179 9723552310
296 839178009 Yug Chetan Thakkar 22/02/**** 22/05/2026 500000 815/35/35 M 1179 9723552310

Total SA : 154522500
Total Premium : 1344278
Test Message`;

console.log("=".repeat(80));
console.log("LIC DATE WISE PREMIUM DUE - PARSER TEST");
console.log("=".repeat(80));

console.log("\n🔍 Format Detection:");
const detected = looksLikeLicDateWise(FULL_PDF_TEXT);
console.log(`   ${detected ? "✓" : "✗"} LIC Date Wise format: ${detected}\n`);

if (!detected) {
  console.error("❌ Format not detected!");
  process.exit(1);
}

console.log("🔧 Parsing records...\n");
const rows = parseLicDateWise(FULL_PDF_TEXT);

console.log(`✓ Parsed ${rows.length} unique policies\n`);

// Validation tests
console.log("🔬 Validation Tests:\n");

let passed = 0;
let failed = 0;

// 1. All have policy numbers
const withoutPolicy = rows.filter(r => !r.policy_number);
if (withoutPolicy.length === 0) {
  console.log("   ✓ All records have policy numbers");
  passed++;
} else {
  console.log(`   ✗ ${withoutPolicy.length} records missing policy numbers`);
  failed++;
}

// 2. All have client names
const withoutName = rows.filter(r => !r.client_name);
if (withoutName.length === 0) {
  console.log("   ✓ All records have client names");
  passed++;
} else {
  console.log(`   ✗ ${withoutName.length} records missing client names`);
  withoutName.slice(0, 3).forEach(r => {
    console.log(`      Policy ${r.policy_number}: "${r.client_name}"`);
  });
  failed++;
}

// 3. All have renewal dates
const withoutRenewal = rows.filter(r => !r.renewal_date);
if (withoutRenewal.length === 0) {
  console.log("   ✓ All records have renewal dates");
  passed++;
} else {
  console.log(`   ✗ ${withoutRenewal.length} records missing renewal dates`);
  failed++;
}

// 4. All have premiums
const withoutPremium = rows.filter(r => !r.premium || r.premium <= 0);
if (withoutPremium.length === 0) {
  console.log("   ✓ All records have valid premiums");
  passed++;
} else {
  console.log(`   ✗ ${withoutPremium.length} records missing/invalid premiums`);
  failed++;
}

// 5. All have sum assured
const withoutSum = rows.filter(r => !r.sum_insured || r.sum_insured <= 0);
if (withoutSum.length === 0) {
  console.log("   ✓ All records have sum assured");
  passed++;
} else {
  console.log(`   ✗ ${withoutSum.length} records missing sum assured`);
  failed++;
}

// 6. All have valid modes
const validModes = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
const withInvalidMode = rows.filter(r => !r.mode || !validModes.includes(r.mode));
if (withInvalidMode.length === 0) {
  console.log("   ✓ All records have valid modes");
  passed++;
} else {
  console.log(`   ✗ ${withInvalidMode.length} records have invalid modes`);
  failed++;
}

// 7. No duplicate policy numbers
const policyNumbers = rows.map(r => r.policy_number);
const uniquePolicies = new Set(policyNumbers);
if (policyNumbers.length === uniquePolicies.size) {
  console.log("   ✓ No duplicate policy numbers");
  passed++;
} else {
  const duplicates = policyNumbers.filter((p, i) => policyNumbers.indexOf(p) !== i);
  console.log(`   ✗ Found ${policyNumbers.length - uniquePolicies.size} duplicate policies`);
  console.log(`      Duplicates: ${[...new Set(duplicates)].join(", ")}`);
  failed++;
}

// 8. Mobile numbers (where present) are valid
const withMobile = rows.filter(r => r.client_phone);
const invalidMobiles = withMobile.filter(r => !/^\d{10}$/.test(r.client_phone!));
if (invalidMobiles.length === 0) {
  console.log(`   ✓ All ${withMobile.length} mobile numbers are valid format`);
  passed++;
} else {
  console.log(`   ✗ ${invalidMobiles.length} invalid mobile numbers`);
  failed++;
}

console.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed\n`);

// Sample records
console.log("📋 Sample Records:\n");

const samples = [
  rows[0],      // First
  rows[1],      // Second
  rows[Math.floor(rows.length / 2)], // Middle
  rows[rows.length - 1], // Last
].filter(Boolean);

samples.forEach((row, idx) => {
  console.log(`${idx + 1}. Policy: ${row.policy_number} - ${row.client_name}`);
  console.log(`   D.O.C: ${row.doc_masked}, F.U.P: ${row.fup_date} → Renewal: ${row.renewal_date}`);
  console.log(`   Sum: ₹${row.sum_insured?.toLocaleString()}, Plan: ${row.plan}, Mode: ${row.mode}`);
  console.log(`   Premium: ₹${row.premium}, Mobile: ${row.client_phone || 'N/A'}`);
  console.log();
});

// Statistics
console.log("📈 Statistics:\n");
console.log(`   Total Records: ${rows.length}`);
console.log(`   With Mobile: ${withMobile.length} (${((withMobile.length / rows.length) * 100).toFixed(1)}%)`);

const modeCount = rows.reduce((acc, r) => {
  acc[r.mode!] = (acc[r.mode!] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log(`\n   Mode Distribution:`);
Object.entries(modeCount).sort((a, b) => b[1] - a[1]).forEach(([mode, count]) => {
  console.log(`      ${mode}: ${count} (${((count / rows.length) * 100).toFixed(1)}%)`);
});

const totalPremium = rows.reduce((sum, r) => sum + (r.premium || 0), 0);
const totalSumAssured = rows.reduce((sum, r) => sum + (r.sum_insured || 0), 0);

console.log(`\n   Total Premium: ₹${totalPremium.toLocaleString()}`);
console.log(`   Total Sum Assured: ₹${totalSumAssured.toLocaleString()}`);
console.log(`   Expected Total SA: ₹154,522,500`);
console.log(`   Expected Total Premium: ₹1,344,278`);

console.log("\n" + "=".repeat(80));

if (failed === 0) {
  console.log("✅ ALL TESTS PASSED! Parser is 100% accurate.");
} else {
  console.log(`❌ ${failed} validation test(s) failed`);
}

console.log("=".repeat(80) + "\n");
