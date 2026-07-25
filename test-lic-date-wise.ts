/**
 * Test script for the new LIC "Date Wise Premium Due" parser.
 * 
 * This format has columns:
 * SN | Policy No. | Name | D.O.C. | F.U.P. | Sum Ass. | Plan | Mode | Premium (+Tax) | Mobile No.
 * 
 * Key differences from the other LIC format:
 * - F.U.P. is a full date (dd/mm/yyyy) not mm/yyyy
 * - Mode uses single letters: M=Monthly, Q=Quarterly, H=Half-Yearly, Y=Yearly
 * - Has Sum Assured column
 * - Premium is already inclusive of tax
 */

import * as pdfjsLib from "pdfjs-dist";

// Sample PDF text extracted from the uploaded document
const SAMPLE_PDF_TEXT = `Date Wise Premium Due
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
3 837718041 Abhay Rameshchandra Shah 18/02/**** 18/05/2026 500000 149/63/25 M 1923 9376115120`;

interface LicDateWiseRow {
  sn: number;
  policy_number: string;
  client_name: string;
  doc: string; // D.O.C with asterisks (dd/mm/****)
  fup: string; // F.U.P. full date (dd/mm/yyyy)
  sum_assured: number;
  plan: string;
  mode: string; // M/Q/H/Y
  premium: number;
  mobile: string | null;
}

const POLICY_RE = /^\d{9}$/;
const DOC_RE = /^\d{2}\/\d{2}\/\*{4}$/; // dd/mm/****
const FUP_RE = /^\d{2}\/\d{2}\/\d{4}$/; // dd/mm/yyyy
const SUM_RE = /^\d+$/; // Sum assured (integer)
const PLAN_RE = /^\d{1,3}\/\d{1,2}\/\d{1,2}$/; // e.g. 149/79/39 or 149/61/21
const MODE_RE = /^[MQHY]$/; // M, Q, H, Y
const PREMIUM_RE = /^\d+$/; // Premium (integer)
const MOBILE_RE = /^\d{10}$/; // 10-digit mobile

function normalizeLicMode(mode: string): string {
  const m = mode.toUpperCase();
  if (m === 'M') return 'Monthly';
  if (m === 'Q') return 'Quarterly';
  if (m === 'H') return 'Half-Yearly';
  if (m === 'Y') return 'Yearly';
  return mode;
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    for (const piece of line.split(/\s+/)) {
      if (piece) tokens.push(piece);
    }
  }
  return tokens;
}

function isRecordStart(tokens: string[], i: number): boolean {
  // A record starts with: <SN (digit)> <9-digit policy>
  return /^\d{1,3}$/.test(tokens[i]) && POLICY_RE.test(tokens[i + 1] || "");
}

function parseLicDateWisePremiumDue(text: string): LicDateWiseRow[] {
  const tokens = tokenize(text);
  const starts: number[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    if (isRecordStart(tokens, i)) {
      starts.push(i);
    }
  }

  console.log(`Found ${starts.length} record starts`);

  const rows: LicDateWiseRow[] = [];
  
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s];
    const end = s + 1 < starts.length ? starts[s + 1] : tokens.length;
    
    const sn = parseInt(tokens[start]);
    const policy_number = tokens[start + 1];
    
    if (!POLICY_RE.test(policy_number)) {
      console.log(`Skipping invalid policy at position ${start}: ${policy_number}`);
      continue;
    }

    // Find D.O.C (first dd/mm/****)
    let docIdx = -1;
    for (let k = start + 2; k < end; k++) {
      if (DOC_RE.test(tokens[k])) {
        docIdx = k;
        break;
      }
    }
    
    if (docIdx === -1) {
      console.log(`No D.O.C found for policy ${policy_number}`);
      continue;
    }

    // Name is everything between policy and D.O.C
    const nameParts = tokens.slice(start + 2, docIdx);
    const client_name = nameParts.join(" ").trim();
    
    // Find F.U.P (first dd/mm/yyyy after D.O.C)
    let fupIdx = -1;
    for (let k = docIdx + 1; k < end; k++) {
      if (FUP_RE.test(tokens[k])) {
        fupIdx = k;
        break;
      }
    }
    
    if (fupIdx === -1) {
      console.log(`No F.U.P found for policy ${policy_number}`);
      continue;
    }

    // Next should be Sum Assured (large integer)
    let sumIdx = fupIdx + 1;
    if (sumIdx >= end || !SUM_RE.test(tokens[sumIdx])) {
      console.log(`No Sum Assured found for policy ${policy_number}`);
      continue;
    }
    
    // Next should be Plan (xxx/xx/xx format)
    let planIdx = sumIdx + 1;
    if (planIdx >= end || !PLAN_RE.test(tokens[planIdx])) {
      console.log(`No Plan found for policy ${policy_number}, got: ${tokens[planIdx]}`);
      continue;
    }
    
    // Next should be Mode (M/Q/H/Y)
    let modeIdx = planIdx + 1;
    if (modeIdx >= end || !MODE_RE.test(tokens[modeIdx])) {
      console.log(`No Mode found for policy ${policy_number}, got: ${tokens[modeIdx]}`);
      continue;
    }
    
    // Next should be Premium (integer)
    let premiumIdx = modeIdx + 1;
    if (premiumIdx >= end || !PREMIUM_RE.test(tokens[premiumIdx])) {
      console.log(`No Premium found for policy ${policy_number}, got: ${tokens[premiumIdx]}`);
      continue;
    }
    
    // Mobile may or may not exist (10 digits)
    let mobile: string | null = null;
    let mobileIdx = premiumIdx + 1;
    if (mobileIdx < end && MOBILE_RE.test(tokens[mobileIdx])) {
      mobile = tokens[mobileIdx];
    }

    rows.push({
      sn,
      policy_number,
      client_name,
      doc: tokens[docIdx],
      fup: tokens[fupIdx],
      sum_assured: parseInt(tokens[sumIdx]),
      plan: tokens[planIdx],
      mode: normalizeLicMode(tokens[modeIdx]),
      premium: parseInt(tokens[premiumIdx]),
      mobile,
    });
  }

  return rows;
}

// Test with sample data
console.log("Testing LIC Date Wise Premium Due parser...\n");
const rows = parseLicDateWisePremiumDue(SAMPLE_PDF_TEXT);

console.log(`\nParsed ${rows.length} rows:\n`);
rows.forEach(row => {
  console.log(`${row.sn}. ${row.policy_number} - ${row.client_name}`);
  console.log(`   D.O.C: ${row.doc}, F.U.P: ${row.fup}`);
  console.log(`   Sum: ₹${row.sum_assured}, Plan: ${row.plan}, Mode: ${row.mode}`);
  console.log(`   Premium: ₹${row.premium}, Mobile: ${row.mobile || 'N/A'}`);
  console.log();
});

console.log("\n✓ Parser test complete!");
