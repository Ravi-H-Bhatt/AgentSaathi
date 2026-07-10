import "server-only";
import type { RegisterRow } from "@/lib/types";
import pdf from 'pdf-parse';

/**
 * COORDINATE-BASED EXTRACTION - FAST & ACCURATE
 * 
 * Uses PDF coordinates to map columns precisely.
 * NO LLM needed - instant extraction from structured PDFs.
 * 
 * Column positions (x coordinates) for New India Assurance Policy Expiry Register:
 */

const COLUMNS = {
  operating_office: { start: 0, end: 80 },
  lob_description: { start: 80, end: 200 },
  policy_number: { start: 200, end: 350 },
  product_name: { start: 350, end: 500 },
  inception_date: { start: 500, end: 600 },
  expiry_date: { start: 600, end: 700 },
  holder_code: { start: 700, end: 800 },
  client_name: { start: 800, end: 1000 },
  address: { start: 1000, end: 1300 },
  pin_code: { start: 1300, end: 1400 },
  phone: { start: 1400, end: 1550 },
  dev_officer: { start: 1550, end: 1700 },
  sum_insured: { start: 1700, end: 1850 },
  premium: { start: 1850, end: 2000 },
  tax: { start: 2000, end: 2150 },
};

interface PDFWord {
  text: string;
  x: number;
  y: number;
}

/**
 * Extract text with coordinates from PDF
 */
async function extractWithCoordinates(buffer: Buffer): Promise<PDFWord[]> {
  const data = await pdf(buffer, {
    // Custom page renderer to get word coordinates
    pagerender: (pageData: any) => {
      const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      return pageData.getTextContent(render_options).then((textContent: any) => {
        const words: PDFWord[] = [];
        let yOffset = 0;
        
        textContent.items.forEach((item: any) => {
          if (item.str.trim()) {
            words.push({
              text: item.str.trim(),
              x: item.transform[4],
              y: item.transform[5] + yOffset,
            });
          }
        });
        
        return words;
      });
    }
  });
  
  return data as any;
}

/**
 * Group words into rows based on Y coordinate
 */
function groupIntoRows(words: PDFWord[]): Map<number, PDFWord[]> {
  const rows = new Map<number, PDFWord[]>();
  const threshold = 5; // Y-coordinate threshold for same row
  
  words.forEach(word => {
    // Find existing row within threshold
    let rowY = word.y;
    for (const existingY of rows.keys()) {
      if (Math.abs(existingY - word.y) < threshold) {
        rowY = existingY;
        break;
      }
    }
    
    if (!rows.has(rowY)) {
      rows.set(rowY, []);
    }
    rows.get(rowY)!.push(word);
  });
  
  // Sort words in each row by X coordinate
  rows.forEach(row => row.sort((a, b) => a.x - b.x));
  
  return rows;
}

/**
 * Find rows that start with "210600" (record markers)
 */
function findRecordStarts(rows: Map<number, PDFWord[]>): number[] {
  const recordYs: number[] = [];
  
  for (const [y, words] of rows.entries()) {
    const firstWord = words[0]?.text;
    if (firstWord === '210600') {
      recordYs.push(y);
    }
  }
  
  return recordYs.sort((a, b) => b - a); // Sort descending (PDF Y goes bottom to top)
}

/**
 * Extract field value from words in a column range
 */
function extractColumn(words: PDFWord[], columnDef: { start: number; end: number }): string {
  return words
    .filter(w => w.x >= columnDef.start && w.x < columnDef.end)
    .map(w => w.text)
    .join(' ')
    .trim();
}

/**
 * Parse money value (remove commas, convert to number)
 */
function parseMoney(s: string): number | null {
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

/**
 * Parse date DD-MMM-YYYY to YYYY-MM-DD
 */
function parseDate(s: string): string | null {
  if (!s) return null;
  
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  
  const match = s.match(/(\d{2})-([a-z]{3})-(\d{4})/i);
  if (!match) return null;
  
  const [, day, month, year] = match;
  const monthNum = months[month.toLowerCase()];
  
  return monthNum ? `${year}-${monthNum}-${day}` : null;
}

/**
 * Extract a single record from words in a Y-range
 */
function extractRecord(words: PDFWord[], yStart: number, yEnd: number): RegisterRow | null {
  // Filter words within this record's Y range
  const recordWords = words.filter(w => w.y >= yEnd && w.y <= yStart);
  
  if (recordWords.length === 0) return null;
  
  // Extract each field based on X coordinates
  const lobDescription = extractColumn(recordWords, COLUMNS.lob_description);
  const policyNumberRaw = extractColumn(recordWords, COLUMNS.policy_number);
  const productName = extractColumn(recordWords, COLUMNS.product_name);
  const inceptionDate = extractColumn(recordWords, COLUMNS.inception_date);
  const expiryDate = extractColumn(recordWords, COLUMNS.expiry_date);
  const clientName = extractColumn(recordWords, COLUMNS.client_name);
  const address = extractColumn(recordWords, COLUMNS.address);
  const pinCode = extractColumn(recordWords, COLUMNS.pin_code);
  const phone = extractColumn(recordWords, COLUMNS.phone);
  const sumInsuredRaw = extractColumn(recordWords, COLUMNS.sum_insured);
  const premiumRaw = extractColumn(recordWords, COLUMNS.premium);
  
  // Extract policy number (long digits in the policy number column)
  const policyMatch = policyNumberRaw.match(/\d{18,26}/);
  const policyNumber = policyMatch ? policyMatch[0] : null;
  
  if (!policyNumber) return null;
  
  // Extract phone (10 digits starting with 6-9)
  const phoneMatch = phone.match(/[6-9]\d{9}/);
  const clientPhone = phoneMatch ? phoneMatch[0] : null;
  
  return {
    sn: null,
    policy_number: policyNumber,
    client_name: clientName || null,
    client_phone: clientPhone,
    client_address: address || null,
    start_date: parseDate(inceptionDate),
    renewal_date: parseDate(expiryDate),
    policy_type: lobDescription || null,
    product_name: productName || null,
    mode: null, // Not in coordinate layout
    premium: parseMoney(premiumRaw),
    sum_insured: parseMoney(sumInsuredRaw),
  };
}

/**
 * MAIN FUNCTION: Parse New India register using coordinates
 */
export async function parseNewIndiaRegisterFast(buffer: Buffer): Promise<RegisterRow[]> {
  console.log('[newindia-fast] Starting coordinate-based extraction...');
  
  const startTime = Date.now();
  
  // Extract text with coordinates
  const words = await extractWithCoordinates(buffer);
  console.log(`[newindia-fast] Extracted ${words.length} words with coordinates`);
  
  // Group into rows
  const rows = groupIntoRows(words);
  console.log(`[newindia-fast] Grouped into ${rows.size} rows`);
  
  // Find record boundaries
  const recordYs = findRecordStarts(rows);
  console.log(`[newindia-fast] Found ${recordYs.length} record markers`);
  
  if (recordYs.length === 0) {
    return [];
  }
  
  // Extract each record
  const results: RegisterRow[] = [];
  
  for (let i = 0; i < recordYs.length; i++) {
    const yStart = recordYs[i];
    const yEnd = i + 1 < recordYs.length ? recordYs[i + 1] : 0;
    
    const record = extractRecord(words, yStart, yEnd);
    if (record) {
      results.push(record);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[newindia-fast] ✅ Extracted ${results.length} policies in ${elapsed}s`);
  
  // Validation
  let complete = 0;
  let needsReview = 0;
  
  results.forEach(r => {
    const missing = [];
    if (!r.client_name) missing.push('name');
    if (!r.product_name) missing.push('product');
    if (!r.sum_insured) missing.push('sum');
    
    if (missing.length === 0) {
      complete++;
    } else {
      needsReview++;
      (r as any).needs_review = true;
      (r as any).missing_fields = missing;
    }
  });
  
  console.log(`[newindia-fast] ✓ Complete: ${complete} | ⚠️ Needs review: ${needsReview}`);
  
  return results;
}

export function looksLikeNewIndiaRegister(text: string): boolean {
  const head = text.slice(0, 8000);
  const hasHeader = /policy\s*expiry\s*register/i.test(head) && /new\s*india/i.test(head);
  const policyNumbers = (text.match(/\d{20,25}:\s*[A-Z]{2}\s+/g) || []).length;
  return hasHeader && policyNumbers >= 5;
}
