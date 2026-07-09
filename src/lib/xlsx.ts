import "server-only";

/**
 * XLSX Parser for Insurance Policy Data
 * Much more efficient than PDF - structured data extracted directly from cells
 * Handles New India registers, generic policy sheets, and custom formats
 */

import type { RegisterRow } from "@/lib/types";

// XLSX parsing library - lightweight alternative to xlsx
function parseXLSXFromBuffer(buffer: Buffer): string[][] {
  // For production, install: npm install xlsx
  // This is a placeholder that would use the xlsx library
  // import XLSX from 'xlsx';
  // const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  // For now, return empty - implementation depends on adding xlsx package
  console.warn("[xlsx] XLSX parsing requires 'xlsx' package. Install: npm install xlsx");
  return [];
}

/**
 * Parse insurance policies from XLSX file
 * Supports both New India format and generic policy templates
 */
export async function parseXLSXPolicies(buffer: Buffer): Promise<RegisterRow[]> {
  try {
    // When xlsx is installed, uncomment the real implementation
    // const XLSX = await import('xlsx');
    // const workbook = XLSX.read(buffer, { type: 'buffer' });
    // const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    // const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
    
    // Placeholder implementation
    console.log("[xlsx] Parsing XLSX file...");
    return [];
  } catch (err) {
    console.error("[xlsx] Parsing error:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Extract policies from generic column-based format
 * Columns: Policy Number | Client Name | Phone | Product | Company | Sum Insured | Premium | Start Date | Renewal Date | Address
 */
export function parseGenericPolicies(rows: string[][]): RegisterRow[] {
  const policies: RegisterRow[] = [];
  
  if (rows.length < 2) return policies;
  
  // Try to auto-detect headers
  const headers = rows[0].map((h: string) => h.toLowerCase().trim());
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    const policyNumber = findColumn(row, headers, ['policy number', 'policy#', 'policy']);
    const clientName = findColumn(row, headers, ['client name', 'insured name', 'name']);
    const phone = findColumn(row, headers, ['phone', 'mobile', 'telephone']);
    const product = findColumn(row, headers, ['product', 'product name', 'plan']);
    const company = findColumn(row, headers, ['company', 'insurer', 'insurance company']);
    const sumInsured = findColumn(row, headers, ['sum insured', 'sum assured', 'coverage']);
    const premium = findColumn(row, headers, ['premium', 'gross premium', 'annual premium']);
    const startDate = findColumn(row, headers, ['start date', 'inception date', 'doc']);
    const renewalDate = findColumn(row, headers, ['renewal date', 'expiry date', 'fup']);
    const address = findColumn(row, headers, ['address', 'client address']);
    
    // Skip if no policy number
    if (!policyNumber) continue;
    
    policies.push({
      sn: i,
      policy_number: policyNumber,
      client_name: clientName || null,
      client_phone: phone || null,
      client_address: address || null,
      policy_type: null, // Will be filled from company/product context
      product_name: product || null,
      mode: null,
      start_date: parseDate(startDate),
      renewal_date: parseDate(renewalDate),
      premium: parseAmount(premium),
      sum_insured: parseAmount(sumInsured),
    });
  }
  
  return policies;
}

/**
 * Parse New India XLSX export format
 * Column format: OperatingOffice | LOB | PolicyNumber | ProductCode | ProductName | ... | SumInsured | GrossPremium | ServiceTax
 */
export function parseNewIndiaXLSX(rows: string[][]): RegisterRow[] {
  const policies: RegisterRow[] = [];
  
  if (rows.length < 2) return policies;
  
  // New India format headers (case-insensitive)
  const headers = rows[0].map((h: string) => h.toLowerCase().trim());
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    const policyNumber = findColumn(row, headers, ['policy number']);
    const insuredName = findColumn(row, headers, ['insured name']);
    const phone = findColumn(row, headers, ['insured telephone 1', 'telephone 1', 'phone']);
    const productCode = findColumn(row, headers, ['product code']);
    const productName = findColumn(row, headers, ['product name']);
    const sumInsured = findColumn(row, headers, ['sum insured']);
    const grossPremium = findColumn(row, headers, ['gross premium']);
    const serviceTax = findColumn(row, headers, ['service tax']);
    const inceptionDate = findColumn(row, headers, ['policy inception date', 'inception date']);
    const expiryDate = findColumn(row, headers, ['policy expiry date', 'expiry date']);
    const address1 = findColumn(row, headers, ['insured address line 1']);
    const address2 = findColumn(row, headers, ['insured address line 2']);
    const address3 = findColumn(row, headers, ['insured address line 3']);
    
    if (!policyNumber) continue;
    
    // Combine address lines
    const fullAddress = [address1, address2, address3]
      .filter(Boolean)
      .join(', ')
      .slice(0, 300) || null;
    
    const premium = sumAmount(parseAmount(grossPremium), parseAmount(serviceTax));
    
    policies.push({
      sn: i,
      policy_number: policyNumber,
      client_name: insuredName || null,
      client_phone: phone || null,
      client_address: fullAddress,
      policy_type: productCode || null,
      product_name: productName || null,
      mode: null,
      start_date: parseDate(inceptionDate),
      renewal_date: parseDate(expiryDate),
      premium: premium,
      sum_insured: parseAmount(sumInsured),
    });
  }
  
  return policies;
}

/**
 * Utility: Find column value by header aliases
 */
function findColumn(row: string[], headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1 && row[idx]) {
      return (row[idx] || '').toString().trim();
    }
  }
  return null;
}

/**
 * Parse date from various formats
 * Supports: DD-MMM-YYYY, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, Excel serial numbers
 */
function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  dateStr = dateStr.toString().trim();
  
  // Excel serial number (number only, typically 40000-50000 for 2009-2035)
  if (/^\d+$/.test(dateStr)) {
    const serial = parseInt(dateStr);
    if (serial > 0 && serial < 100000) {
      const date = new Date((serial - 25569) * 86400 * 1000); // Excel epoch is 1900-01-01
      return date.toISOString().split('T')[0];
    }
  }
  
  // DD-MMM-YYYY (e.g., 03-Jul-2024)
  const match1 = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (match1) {
    const [, day, month, year] = match1;
    const monthMap: Record<string, string> = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    };
    const m = monthMap[month.toLowerCase()];
    if (m) return `${year}-${m}-${day.padStart(2, '0')}`;
  }
  
  // DD/MM/YYYY or MM/DD/YYYY (try both)
  const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match2) {
    const [, part1, part2, year] = match2;
    const d1 = parseInt(part1);
    const d2 = parseInt(part2);
    
    // If first part > 12, it must be DD/MM
    if (d1 > 12) {
      return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    }
    // If second part > 12, it must be MM/DD
    if (d2 > 12) {
      return `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
    }
    // Ambiguous - assume DD/MM for Indian context
    return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
  }
  
  // YYYY-MM-DD (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  return null;
}

/**
 * Parse amount from various formats
 * Supports: 100000, 100,000, "100,000", "₹100,000", etc.
 */
function parseAmount(amountStr: string | null): number | null {
  if (!amountStr) return null;
  
  const cleaned = amountStr
    .toString()
    .replace(/[₹$,\s]/g, '')
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Sum two amounts (for gross premium + service tax)
 */
function sumAmount(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return a + b;
}

/**
 * Detect XLSX format and parse accordingly
 */
export async function detectAndParseXLSX(buffer: Buffer, rows: string[][]): Promise<RegisterRow[]> {
  // Check if it looks like New India format
  const headers = rows[0]?.map((h: string) => h.toLowerCase()) || [];
  
  const hasNewIndiaHeaders = headers.some(h => 
    h.includes('policy number') && h.includes('product')
  );
  
  if (hasNewIndiaHeaders && headers.some(h => h.includes('insured name'))) {
    console.log("[xlsx] Detected New India format");
    return parseNewIndiaXLSX(rows);
  }
  
  // Default to generic format
  console.log("[xlsx] Using generic format parser");
  return parseGenericPolicies(rows);
}
