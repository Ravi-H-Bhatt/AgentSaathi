import type { RegisterRow } from "@/lib/types";
import { licModeLabel } from "@/lib/lic-renewal";

/**
 * Parser for LIC "Date Wise Premium Due" report.
 * 
 * Format: Date range report (e.g., 01/05/2026 - 31/05/2026)
 * 
 * Columns:
 * SN | Policy No. | Name | D.O.C. | F.U.P. | Sum Ass. | Plan | Mode | Premium (+Tax) | Mobile No.
 * 
 * Key features:
 * - D.O.C. has year masked with asterisks (dd/mm/****)
 * - F.U.P. (First Unpaid Premium) is the actual renewal date (dd/mm/yyyy)
 * - Mode: M=Monthly, Q=Quarterly, H=Half-Yearly, Y=Yearly
 * - Sum Assured is present
 * - Premium includes GST
 * - Mobile number may be missing for some entries
 * 
 * Deduplication: By policy_number (9-digit LIC policy number)
 */

export interface LicDateWiseRow extends RegisterRow {
  /** Date of Commencement with masked year (dd/mm/****). */
  doc_masked?: string | null;
  /** First Unpaid Premium - the actual renewal date (dd/mm/yyyy). */
  fup_date?: string | null;
  /** Sum Assured amount. */
  sum_assured?: number | null;
  /** Plan code in format xxx/xx/xx (e.g., 149/79/39). */
  plan?: string | null;
}

// Regex patterns
const POLICY_RE = /^\d{9}$/; // 9-digit LIC policy number
const DOC_RE = /^\d{2}\/\d{2}\/\*{4}$/; // D.O.C: dd/mm/****
const FUP_RE = /^\d{2}\/\d{2}\/\d{4}$/; // F.U.P: dd/mm/yyyy
const SUM_RE = /^\d+$/; // Sum assured (integer)
const PLAN_RE = /^\d{1,3}\/\d{1,2}\/\d{1,2}$/; // Plan: xxx/xx/xx
const MODE_RE = /^[MQHY]$/; // Mode: M, Q, H, Y
const PREMIUM_RE = /^\d+$/; // Premium (integer)
const MOBILE_RE = /^\d{10}$/; // 10-digit mobile
const SN_RE = /^\d{1,3}$/; // Serial number

/**
 * Does this text look like an LIC Date Wise Premium Due report?
 */
export function looksLikeLicDateWise(text: string): boolean {
  const t = text || "";
  
  // Report title
  if (/date\s+wise\s+premium\s+due/i.test(t)) return true;
  
  // Look for characteristic column headers
  const signals = [
    /date\s+wise\s+premium/i,
    /D\.O\.C\./i,
    /F\.U\.P\./i,
    /Sum\s+Ass\./i,
    /Premium\s*\(\s*\+\s*Tax\s*\)/i,
  ].reduce((n, re) => (re.test(t) ? n + 1 : n), 0);
  
  if (signals >= 2) return true;
  
  // Data-shape fallback: masked DOC dates + FUP dates + 9-digit policies
  const docHits = (t.match(/\d{2}\/\d{2}\/\*{4}/g) || []).length;
  const fupHits = (t.match(/\d{2}\/\d{2}\/\d{4}/g) || []).length;
  const policyHits = (t.match(/\b\d{9}\b/g) || []).length;
  
  return docHits >= 5 && fupHits >= 5 && policyHits >= 5;
}

/** Convert mode letter to standard format. */
function normalizeLicMode(mode: string): string {
  const m = mode.toUpperCase();
  if (m === 'M') return 'Monthly';
  if (m === 'Q') return 'Quarterly';
  if (m === 'H') return 'Half-Yearly';
  if (m === 'Y') return 'Yearly';
  return mode;
}

/** Convert dd/mm/yyyy to ISO yyyy-mm-dd. */
function fupToIso(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Extract D.O.C day and month, apply to current/next year for start_date estimation. */
function docToApproximateIso(docMasked: string): string | null {
  const m = docMasked.match(/^(\d{2})\/(\d{2})\/\*{4}$/);
  if (!m) return null;
  const [, dd, mm] = m;
  const day = Number(dd);
  const month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  
  // Use current year as approximation (year doesn't affect renewal logic)
  const year = new Date().getFullYear();
  return `${year}-${mm}-${dd}`;
}

/** Tokenize report text into clean tokens. */
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

/** Check if position marks the start of a record. */
function isRecordStart(tokens: string[], i: number): boolean {
  return SN_RE.test(tokens[i]) && POLICY_RE.test(tokens[i + 1] || "");
}

/** Clean assured name. */
function cleanName(name: string): string | null {
  const t = name.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();
  return t.length ? t : null;
}

/** Parse one record. */
function parseRecord(
  tokens: string[],
  start: number,
  end: number
): LicDateWiseRow | null {
  const sn = SN_RE.test(tokens[start]) ? Number(tokens[start]) : null;
  const policy_number = tokens[start + 1];
  
  if (!POLICY_RE.test(policy_number)) return null;

  // Find D.O.C (dd/mm/****)
  let docIdx = -1;
  for (let k = start + 2; k < end; k++) {
    if (DOC_RE.test(tokens[k])) {
      docIdx = k;
      break;
    }
  }
  
  if (docIdx === -1) return null;

  // Name is everything between policy and D.O.C
  const nameRaw = tokens.slice(start + 2, docIdx).join(" ");
  const client_name = cleanName(nameRaw);
  
  if (!client_name) return null;

  const docMasked = tokens[docIdx];
  
  // Find F.U.P (dd/mm/yyyy after D.O.C)
  let fupIdx = -1;
  for (let k = docIdx + 1; k < end; k++) {
    if (FUP_RE.test(tokens[k])) {
      fupIdx = k;
      break;
    }
  }
  
  if (fupIdx === -1) return null;

  const fupRaw = tokens[fupIdx];
  const renewal_date = fupToIso(fupRaw);
  
  // Next: Sum Assured
  let sumIdx = fupIdx + 1;
  if (sumIdx >= end || !SUM_RE.test(tokens[sumIdx])) return null;
  const sum_assured = Number(tokens[sumIdx]);
  
  // Next: Plan
  let planIdx = sumIdx + 1;
  if (planIdx >= end || !PLAN_RE.test(tokens[planIdx])) return null;
  const plan = tokens[planIdx];
  
  // Next: Mode
  let modeIdx = planIdx + 1;
  if (modeIdx >= end || !MODE_RE.test(tokens[modeIdx])) return null;
  const rawMode = tokens[modeIdx];
  const mode = normalizeLicMode(rawMode);
  
  // Next: Premium
  let premiumIdx = modeIdx + 1;
  if (premiumIdx >= end || !PREMIUM_RE.test(tokens[premiumIdx])) return null;
  const premium = Number(tokens[premiumIdx]);
  
  // Mobile (optional)
  let mobile: string | null = null;
  let mobileIdx = premiumIdx + 1;
  if (mobileIdx < end && MOBILE_RE.test(tokens[mobileIdx])) {
    mobile = tokens[mobileIdx];
  }

  // Approximate start_date from D.O.C (for display/reference only)
  const start_date = docToApproximateIso(docMasked);

  return {
    sn,
    client_name,
    client_phone: mobile,
    client_address: null,
    company: "LIC",
    policy_holder_type: null,
    policy_number,
    previous_policy_number: null,
    policy_type: plan,
    product_name: null,
    mode,
    start_date, // Approximate (year masked in source)
    renewal_date, // Actual date from F.U.P
    premium,
    sum_insured: sum_assured,
    // LIC Date Wise specific fields
    doc_masked: docMasked,
    fup_date: fupRaw,
    sum_assured,
    plan,
  };
}

/** Parse full LIC Date Wise Premium Due report. */
export function parseLicDateWise(text: string): LicDateWiseRow[] {
  const tokens = tokenize(text);
  
  // Find all record starts
  const starts: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (isRecordStart(tokens, i)) {
      starts.push(i);
    }
  }

  const rows: LicDateWiseRow[] = [];
  const seen = new Set<string>(); // Dedup by policy number
  
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s];
    const end = s + 1 < starts.length ? starts[s + 1] : tokens.length;
    
    const row = parseRecord(tokens, start, end);
    
    if (row && row.policy_number && row.client_name) {
      // Dedup: skip if we've already seen this policy number
      if (seen.has(row.policy_number)) {
        console.warn(`Duplicate policy number ${row.policy_number} skipped`);
        continue;
      }
      
      seen.add(row.policy_number);
      rows.push(row);
    }
  }
  
  return rows;
}
