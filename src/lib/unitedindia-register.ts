/**
 * United India Insurance Premium Register Parser
 * Parses the table-format Premium Register PDFs with multiple policies
 * 
 * NOTE: This register does NOT contain premium information - only sum insured.
 * Premium must be entered manually or calculated separately.
 */

import type { RegisterRow } from "./types";

export interface UnitedIndiaRegisterRow {
  sn: number;
  policy_number: string;
  client_name: string;
  policy_effective_date: string;
  policy_expiry_date: string;
  sum_insured: number;
  collection_date: string;
  policy_type: string;
  intermediary_code?: string;
  collection_number?: string;
}

/**
 * Check if text looks like a United India Premium Register
 */
export function looksLikeUnitedIndiaRegister(text: string): boolean {
  const header = text.slice(0, 2000).toLowerCase();
  return (
    header.includes("united india insurance") &&
    header.includes("premium register") &&
    (header.includes("policy number") || header.includes("policy effective")) &&
    header.includes("insured name")
  );
}

/**
 * Parse United India Premium Register from PDF text
 * Format: Multi-page table with columns:
 * S.NO | RO Code | Office Code | Policy Number | Endorsement Number | Collection Date | 
 * Insured Name | Policy Effective Date | Policy Expiry Date | Department | Sum Insured | TP Premium | OD
 * 
 * NOTE: Premium is NOT extracted from this register as it's not reliably present
 */
export function parseUnitedIndiaRegister(text: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  
  // Clean up text
  const cleanText = text.replace(/\r/g, '');
  
  // Find all policy entries
  // Pattern: S.NO (1-3 digits) followed by RO Code (6 digits) and Office Code (7 digits) and Policy Number
  // NOTE: Don't use ^ anchor because PDF text may be on one line without newlines
  const policyPattern = /(\d{1,3})\s+(\d{6})\s+(\d{7})\s+(\d+[A-Z]\d+)/g;
  
  let match;
  const entries: Array<{startIndex: number; sn: number; policyNumber: string}> = [];
  
  while ((match = policyPattern.exec(text)) !== null) {
    const sn = parseInt(match[1]);
    const policyNumber = match[4];
    
    // Only process if this looks like a valid S.NO (1-99, not a large number)
    if (sn >= 1 && sn <= 99) {
      entries.push({
        startIndex: match.index,
        sn,
        policyNumber
      });
    }
  }
  
  console.log(`[United India Register] Found ${entries.length} potential policy entries`);
  
  // Process each entry
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const nextEntry = entries[i + 1];
    
    // Extract text block for this entry (from current to next entry or end)
    const endIndex = nextEntry ? nextEntry.startIndex : text.length;
    const blockText = text.substring(entry.startIndex, endIndex);
    
    try {
      const row = parseUnitedIndiaEntry(blockText, entry.sn, entry.policyNumber);
      if (row) {
        rows.push(row);
      }
    } catch (err) {
      console.error(`[United India Register] Failed to parse entry ${entry.sn}:`, err);
    }
  }
  
  console.log(`[United India Register] Parsed ${rows.length} policies`);
  return rows;
}

/**
 * Parse a single United India Premium Register entry
 * 
 * Layout:
 * Line 1: SN RO_Code Office_Code Policy_Number Endorsement Collection_Date Insured_Name 
 *         Policy_Effective_Date Policy_Expiry_Date Department Sum_Insured TP_Premium OD
 * Line 2: (Additional details like RO_Name, Office_Name, Intermediary, etc.)
 * 
 * Example:
 * 1 060000 9060500 0605002826P104874070 0 02/07/2026 RUPALI R. DAVE 6 Jul 2026 5 Jul 2027 Health 600000.00 0.00 57409
 */
function parseUnitedIndiaEntry(blockText: string, sn: number, policyNumber: string): RegisterRow | null {
  const lines = blockText.split('\n').map(l => l.trim()).filter(l => l);
  
  // Extract insured name - it appears between the collection date and policy effective date
  // Pattern: DD/MM/YYYY NAME D(D) Mon YYYY
  const nameMatch = blockText.match(/\d{2}\/\d{2}\/\d{4}\s+([A-Z][A-Z\s.]+?)\s+\d{1,2}\s+\w{3}\s+\d{4}/);
  const client_name = nameMatch ? nameMatch[1].trim() : null;
  
  // Extract policy effective and expiry dates
  // Format: "6 Jul 2026" followed by "5 Jul 2027"
  const dateMatches = blockText.match(/(\d{1,2}\s+\w{3}\s+\d{4})\s+(\d{1,2}\s+\w{3}\s+\d{4})/);
  const start_date = dateMatches ? parseDateFormat(dateMatches[1]) : null;
  const renewal_date = dateMatches ? parseDateFormat(dateMatches[2]) : null;
  
  // Extract sum insured - it appears after "Health" keyword
  // Pattern: Health XXXXXX.XX
  const sumInsuredMatch = blockText.match(/Health\s+([\d.]+)/);
  const sum_insured = sumInsuredMatch ? parseFloat(sumInsuredMatch[1]) : null;
  
  if (!client_name || !policyNumber) {
    return null;
  }
  
  return {
    sn,
    client_name,
    policy_number: policyNumber,
    policy_type: "Health Insurance",
    company: "United India Insurance Company Limited",
    product_name: "Health Insurance",
    start_date,
    renewal_date,
    sum_insured,
    premium: null, // Premium not available in this register
    client_address: null,
    client_phone: null,
    mode: null,
  };
}

/**
 * Convert dd/mm/yyyy to ISO date
 */
function toIsoDate(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse date in format "6 Jul 2026" to ISO
 */
function parseDateFormat(dateStr: string): string | null {
  const months: {[key: string]: string} = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  const match = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
  if (!match) return null;
  
  const [, day, month, year] = match;
  const monthNum = months[month.toLowerCase()];
  if (!monthNum) return null;
  
  const paddedDay = day.padStart(2, '0');
  return `${year}-${monthNum}-${paddedDay}`;
}
