import { looksLikeUnitedIndiaRegister, parseUnitedIndiaRegister } from "./src/lib/unitedindia-register";

// Test with the sample text from the PDF
const sampleText = `UNITED INDIA INSURANCE COMPANY LIMITED
Premium Register
From : 1 Jul 2026 , To : 26 Jul 2026
Report Run Date & Time : 26 Jul 2026 13:41
(Amount in Rs)
Page No: 1 / 5

S.NO. RO Code Office Code Policy Number Endorsement Collection Insured Name Policy Effective Policy Expiry Department Sum Insured TP Premium OD

1 060000 9060500 0605002826P104874070 0 02/07/2026 RUPALI R. DAVE 6 Jul 2026 5 Jul 2027 Health 600000.00 0.00 57409
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NA No Co-Insurance 10106050026135416886 OFFICE POLICY 100 NO

2 060000 9060500 0605002826P104959270 0 03/07/2026 JAGRUTIBEN J. VASAVADA 16 Jul 2026 15 Jul 2027 Health 250000.00 0.00 2924
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NA No Co-Insurance 10106050026135504426 Portal Policy 100 NO`;

console.log("Testing United India Premium Register Parser");
console.log("=".repeat(50));

console.log("\n1. Testing looksLikeUnitedIndiaRegister()...");
const looks = looksLikeUnitedIndiaRegister(sampleText);
console.log(`   Result: ${looks}`);

if (!looks) {
  console.log("\n   ❌ FAILED: Not detected as United India Register");
  console.log("\n   Checking for required patterns:");
  console.log(`   - "united india insurance": ${sampleText.toLowerCase().includes("united india insurance")}`);
  console.log(`   - "premium register": ${sampleText.toLowerCase().includes("premium register")}`);
  console.log(`   - "policy number" or "policy effective": ${sampleText.toLowerCase().includes("policy number") || sampleText.toLowerCase().includes("policy effective")}`);
  console.log(`   - "insured name": ${sampleText.toLowerCase().includes("insured name")}`);
} else {
  console.log("\n   ✅ PASSED: Detected as United India Register");
  
  console.log("\n2. Testing parseUnitedIndiaRegister()...");
  try {
    const rows = parseUnitedIndiaRegister(sampleText);
    console.log(`   Result: Parsed ${rows.length} rows`);
    
    if (rows.length > 0) {
      console.log("\n   ✅ PASSED: Successfully parsed rows");
      console.log("\n   Parsed policies:");
      rows.forEach((row, idx) => {
        console.log(`\n   Policy ${idx + 1}:`);
        console.log(`   - Client: ${row.client_name}`);
        console.log(`   - Policy: ${row.policy_number}`);
        console.log(`   - Premium: ${row.premium}`);
        console.log(`   - Sum Insured: ${row.sum_insured}`);
        console.log(`   - Start: ${row.start_date}`);
        console.log(`   - Renewal: ${row.renewal_date}`);
      });
    } else {
      console.log("\n   ❌ FAILED: No rows parsed");
    }
  } catch (err) {
    console.log(`\n   ❌ FAILED: ${err}`);
  }
}
