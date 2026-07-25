/**
 * Comprehensive test for LIC Date Wise Premium Due parser.
 * Tests with the uploaded PDF to ensure all 296 entries are parsed correctly.
 */

import * as fs from "fs";
import * as pdfjsLib from "pdfjs-dist";
import { parseLicDateWise, looksLikeLicDateWise } from "./src/lib/lic-date-wise";

// Set up PDF.js worker
const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function extractPdfText(pdfPath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  
  return fullText;
}

async function main() {
  console.log("=".repeat(80));
  console.log("LIC DATE WISE PREMIUM DUE - COMPREHENSIVE TEST");
  console.log("=".repeat(80));
  
  // Use the uploaded PDF (you'll need to save it to this location)
  const pdfPath = process.argv[2] || "./wert_2.pdf";
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`\n❌ PDF not found: ${pdfPath}`);
    console.error(`\nUsage: npx tsx test-lic-date-wise-full.ts <path-to-pdf>`);
    process.exit(1);
  }
  
  console.log(`\n📄 Extracting text from: ${pdfPath}\n`);
  
  const text = await extractPdfText(pdfPath);
  
  console.log(`✓ Extracted ${text.length} characters\n`);
  
  // Detection test
  console.log("🔍 Format Detection:");
  const detected = looksLikeLicDateWise(text);
  console.log(`   ${detected ? "✓" : "✗"} LIC Date Wise format: ${detected}\n`);
  
  if (!detected) {
    console.error("❌ Format not detected! Showing first 500 chars of extracted text:\n");
    console.log(text.substring(0, 500));
    process.exit(1);
  }
  
  // Parse
  console.log("🔧 Parsing records...\n");
  const rows = parseLicDateWise(text);
  
  console.log(`✓ Parsed ${rows.length} unique policies\n`);
  
  // Expected count from PDF
  const EXPECTED_COUNT = 296;
  
  if (rows.length !== EXPECTED_COUNT) {
    console.warn(`⚠️  Warning: Expected ${EXPECTED_COUNT} records, got ${rows.length}`);
    console.warn(`   Difference: ${EXPECTED_COUNT - rows.length}\n`);
  } else {
    console.log(`✓ Count matches expected: ${EXPECTED_COUNT}\n`);
  }
  
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
    console.log(`   ✗ Found ${policyNumbers.length - uniquePolicies.size} duplicate policies`);
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
  
  console.log("\n" + "=".repeat(80));
  
  if (failed === 0 && rows.length === EXPECTED_COUNT) {
    console.log("✅ ALL TESTS PASSED! Parser is 100% accurate.");
  } else if (failed === 0) {
    console.log("✅ All validation tests passed!");
    console.log(`⚠️  But record count mismatch: expected ${EXPECTED_COUNT}, got ${rows.length}`);
  } else {
    console.log(`❌ ${failed} validation test(s) failed`);
  }
  
  console.log("=".repeat(80) + "\n");
}

main().catch(console.error);
