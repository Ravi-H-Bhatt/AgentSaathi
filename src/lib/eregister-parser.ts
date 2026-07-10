import type { RegisterRow } from "@/lib/types";

/**
 * E-REGISTER PARSER - TMI/Multi-Company Format
 * 
 * Coordinate-based extraction for E-Register PDFs with format:
 * Tra ID | Appl Date | Ins.Co | Type of Policy | Name of Client | PolicyNo | From Date | To Date | Total Premium
 */

const EREGISTER_COLUMNS = {
  tra_id: { x: 32, width: 64 },           // 32-96
  appl_date: { x: 103, width: 60 },       // 103-163
  ins_co: { x: 163, width: 77 },          // 163-240 (EXPANDED to catch x=170)
  policy_type: { x: 240, width: 250 },    // 240-490 (Wide to catch all, will clean up)
  client_name: { x: 490, width: 132 },    // 490-622 (Name of Client)
  proposer_name: { x: 722, width: 128 },  // 722-850
  policy_number: { x: 928, width: 128 },  // 928-1056 (long policy numbers)
  source_code: { x: 1101, width: 28 },    // 1101-1129
  source_name: { x: 1161, width: 131 },   // 1161-1292
  from_date: { x: 1309, width: 60 },      // 1309-1369 (Start Date)
  to_date: { x: 1375, width: 60 },        // 1375-1435 (Renewal Date)
  basic: { x: 1465, width: 50 },          // 1465-1515 (EXPANDED to catch x=1465)
  gst: { x: 1518, width: 35 },            // 1518-1553
  surcharge: { x: 1560, width: 57 },      // 1560-1617
  other_charge: { x: 1634, width: 40 },   // 1634-1674
  tp: { x: 1709, width: 50 },             // 1709-1759 (EXPANDED)
  total_premium: { x: 1757, width: 51 },  // 1757-1808
};

interface PDFItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Extract text with coordinates
 */
async function extractWithCoordinates(buffer: Buffer): Promise<PDFItem[]> {
  const { getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  
  const allItems: PDFItem[] = [];
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const pageHeight = page.view[3];
    const yOffset = (pageNum - 1) * (pageHeight + 100);
    
    textContent.items.forEach((item: any) => {
      if (item.str.trim()) {
        allItems.push({
          str: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]) + yOffset,
        });
      }
    });
  }
  
  return allItems;
}

/**
 * Find all record start positions (rows with "PZ" + 8 digits at x=32)
 */
function findRecordStarts(items: PDFItem[]): number[] {
  const recordYs: number[] = [];
  
  items.forEach(item => {
    // Look for Tra ID pattern: PZ followed by 8 digits at x=32
    if (/^PZ\d{8}$/.test(item.str) && item.x >= 28 && item.x <= 36) {
      if (!recordYs.includes(item.y)) {
        recordYs.push(item.y);
      }
    }
  });
  
  return recordYs.sort((a, b) => b - a); // Descending
}

/**
 * Extract column text with strict boundaries
 */
function extractColumn(
  items: PDFItem[],
  column: { x: number; width: number },
  yStart: number,
  yEnd: number
): string {
  const xMin = column.x;
  const xMax = column.x + column.width;
  
  // Filter header text
  const isHeaderText = (str: string): boolean => {
    // EXACT match only for headers to avoid filtering valid data
    const headers = [
      'Tra ID', 'Appl Date', 'Ins.Co', 'Type of Policy', 'Name of Client',
      'Proposer Name', 'PolicyNo', 'Source', 'Code', 'Source Name',
      'From Date', 'To Date', 'Basic', 'GST', 'Surcharge', 'Other',
      'Charge', 'Total', 'Premium', 'Remarks', 'Downloads',
      'E-Register', 'TMI', 'Back', 'Period Between Dates'
    ];
    // Exact match or starts with header (to catch multi-word headers)
    return headers.some(h => str === h || str.startsWith(h + ' '));
  };
  
  const filtered = items
    .filter(item =>
      item.y >= yEnd &&
      item.y <= yStart &&
      item.x >= xMin &&
      item.x < xMax &&
      !isHeaderText(item.str)
    )
    .sort((a, b) => b.y - a.y || a.x - b.x);
  
  return filtered
    .map(item => item.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse date DD/MM/YYYY to YYYY-MM-DD
 */
function parseDate(s: string): string | null {
  if (!s) return null;
  
  // Match DD/MM/YYYY
  const match = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Parse money value
 */
function parseMoney(s: string): number | null {
  if (!s) return null;
  
  // Remove everything except digits and decimal point
  const cleaned = s.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num); // Round to integer
}

/**
 * Extract a single record
 */
function extractRecord(
  items: PDFItem[],
  yStart: number,
  yEnd: number
): RegisterRow | null {
  const insCoRaw = extractColumn(items, EREGISTER_COLUMNS.ins_co, yStart, yEnd);
  const policyTypeRaw = extractColumn(items, EREGISTER_COLUMNS.policy_type, yStart, yEnd);
  const clientNameRaw = extractColumn(items, EREGISTER_COLUMNS.client_name, yStart, yEnd);
  const policyNumberRaw = extractColumn(items, EREGISTER_COLUMNS.policy_number, yStart, yEnd);
  const fromDateRaw = extractColumn(items, EREGISTER_COLUMNS.from_date, yStart, yEnd);
  const toDateRaw = extractColumn(items, EREGISTER_COLUMNS.to_date, yStart, yEnd);
  const totalPremiumRaw = extractColumn(items, EREGISTER_COLUMNS.total_premium, yStart, yEnd);
  
  // Must have at least client name
  if (!clientNameRaw) return null;
  
  // Clean data
  let clientName = clientNameRaw.trim();
  let policyType = policyTypeRaw.trim() || null;
  let insCo = insCoRaw.trim() || null;
  
  // Clean insurance company name - remove any trailing numbers or codes
  if (insCo) {
    // Remove trailing numbers/codes that might have leaked from next column
    insCo = insCo.replace(/\s+\d+$/, '').trim();
  }
  
  // CRITICAL: Policy type column (240-490) overlaps with client name (490-622)
  // If policy type contains the client name, it means the name leaked in - extract just the type part
  if (policyType && clientName && policyType.includes(clientName)) {
    // Remove the client name from policy type
    policyType = policyType.replace(clientName, '').trim();
  }
  
  // Also check if policy type has extra words after common type keywords
  // Common patterns: "PVT CAR PACKAGE", "TWO WHEELER PACKAGE", "PA INDIVIDUAL", etc.
  // If there are 4+ words, likely has client name leaked - take first 3-4 words
  if (policyType) {
    const words = policyType.split(/\s+/);
    if (words.length > 5) {
      // Likely contaminated - take first 4 words as policy type
      policyType = words.slice(0, 4).join(' ');
    }
  }
  
  // Policy number - extract alphanumeric pattern (handles both formats: D229524195 and 12-8428-0000936226-00)
  let policyNumber: string | null = null;
  if (policyNumberRaw) {
    // Try standard format first: single letter + 9+ digits
    const standard = policyNumberRaw.match(/[A-Z]\d{9,}/)?.[0];
    if (standard) {
      policyNumber = standard;
    } else {
      // Try dashed format: digits-digits-digits-digits
      const dashed = policyNumberRaw.match(/\d{2,}-\d{4,}-\d{10,}-\d{2}/)?.[0];
      if (dashed) {
        policyNumber = dashed;
      } else {
        // Fallback: any sequence with letters and digits (min 8 chars)
        const fallback = policyNumberRaw.match(/[A-Z0-9]{8,}/)?.[0];
        if (fallback) policyNumber = fallback;
      }
    }
  }
  
  // Parse dates
  const startDate = parseDate(fromDateRaw);
  const renewalDate = parseDate(toDateRaw);
  
  // Parse premium - try multiple columns if needed
  let premium = parseMoney(totalPremiumRaw);
  
  // If no premium in total column, try basic column
  if (!premium) {
    const basicRaw = extractColumn(items, EREGISTER_COLUMNS.basic, yStart, yEnd);
    premium = parseMoney(basicRaw);
  }
  
  // If still no premium, try wider search around total premium column (±50px)
  if (!premium) {
    const widerPremium = extractColumn(
      items,
      { x: 1700, width: 150 },  // 1700-1850 (wider search)
      yStart,
      yEnd
    );
    premium = parseMoney(widerPremium);
  }
  
  return {
    sn: null,
    policy_number: policyNumber,
    client_name: clientName,
    client_phone: null, // Not in E-Register format
    client_address: null, // Not in E-Register format
    start_date: startDate,
    renewal_date: renewalDate,
    policy_type: policyType,
    product_name: insCo, // Use Insurance Company as product name
    mode: null,
    premium: premium,
    sum_insured: null, // Not in E-Register format
  };
}

/**
 * MAIN: Parse E-Register PDF
 */
export async function parseERegister(buffer: Buffer): Promise<RegisterRow[]> {
  console.log('[eregister] Starting coordinate-based extraction...');
  
  const startTime = Date.now();
  
  const items = await extractWithCoordinates(buffer);
  console.log(`[eregister] Extracted ${items.length} items with coordinates`);
  
  const recordYs = findRecordStarts(items);
  console.log(`[eregister] Found ${recordYs.length} records`);
  
  if (recordYs.length === 0) {
    return [];
  }
  
  const results: RegisterRow[] = [];
  
  for (let i = 0; i < recordYs.length; i++) {
    const yStart = recordYs[i];
    const yEnd = i + 1 < recordYs.length ? recordYs[i + 1] + 5 : 0;
    
    const record = extractRecord(items, yStart, yEnd);
    if (record) {
      results.push(record);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[eregister] ✅ Extracted ${results.length} policies in ${elapsed}s`);
  
  // Validation
  const complete = results.filter(r =>
    r.client_name && r.start_date && r.renewal_date
  ).length;
  
  console.log(`[eregister] ✓ Complete: ${complete}/${results.length} (${((complete/results.length)*100).toFixed(1)}%)`);
  
  return results;
}

/**
 * Detect if PDF is E-Register format
 */
export function looksLikeERegister(text: string): boolean {
  const head = text.slice(0, 3000);
  return (
    /E-Register/i.test(head) &&
    /Tra ID/i.test(head) &&
    /Type of Policy/i.test(head) &&
    /PZ\d{8}/.test(head)
  );
}
