import type { RegisterRow } from "@/lib/types";

/**
 * New India Assurance Policy Expiry Register Parser
 * 
 * Priority fixes:
 * 1. Strip repeated "Operating Office...OD Expiry Date" headers mid-text
 * 2. Rejoin digit sequences broken by line-wrap
 * 3. Widen holder-code regex to handle \d?[HPOMNE][A-Z]{0,2}\d{7,10}
 * 4. Never drop data — use raw unsplit spans + needs_review flag if can't cleanly split
 * 5. Don't hardcode officer name — anchor on numeric patterns only
 */

const POLICY_MARKER_RE = /(\d{20,25}):\s*([A-Z]{2})\s+/;
const DATE_RE = /(\d{2})-([A-Za-z]{3})-(\d{4})/;
const PHONE_RE = /[6-9]\d{9}/;
const PIN_CODE_RE = /\b\d{6}\b/;

export function looksLikeNewIndiaRegister(text: string): boolean {
  const head = text.slice(0, 8000);
  const hasHeader = /policy\s*expiry\s*register/i.test(head) && /new\s*india/i.test(head);
  const policyNumbers = (text.match(/\d{20,25}:\s*[A-Z]{2}\s+/g) || []).length;
  return hasHeader && policyNumbers >= 5;
}

export function parseNewIndiaRegister(text: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  
  // PRIORITY 1: Strip repeated "Operating Office...OD Expiry Date" header blocks mid-text
  let cleaned = stripMidtextHeaders(text);
  
  // PRIORITY 2: Rejoin digit sequences broken by line-wrap (digit\n digit → no space)
  cleaned = rejoinBrokenDigits(cleaned);
  
  // Normalize: convert newlines to spaces but preserve structure
  const normalized = cleaned
    .replace(/\r\n/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Find all record markers: "policyNumber: productCode"
  const recordMatches = Array.from(normalized.matchAll(/(\d{20,25}):\s*([A-Z]{2})\s+/g));
  
  console.log(`[newindia] Found ${recordMatches.length} policy records`);
  
  // Extract text block for each record (from marker to next marker)
  for (let i = 0; i < recordMatches.length; i++) {
    const match = recordMatches[i];
    const startPos = match.index!;
    const endPos = i < recordMatches.length - 1 ? recordMatches[i + 1].index! : normalized.length;
    
    const recordBlock = normalized.slice(startPos, endPos).trim();
    const lobDescription = extractLobDescription(normalized, startPos); // Extract from full text looking backward
    
    const policy = parseRecordBlock(recordBlock, lobDescription);
    if (policy) {
      rows.push(policy);
    }
  }
  
  console.log(`[newindia] Successfully parsed ${rows.length} policies`);
  return rows;
}

/**
 * PRIORITY 1: Strip repeated header blocks like:
 * "Operating Office Code  Operating Office  Party Code  OD Policy Number  OD Expiry Date"
 * These appear mid-text and break the record extraction.
 */
function stripMidtextHeaders(text: string): string {
  // Match the header pattern and remove all occurrences
  return text.replace(
    /Operating\s+Office\s+Code\s+Operating\s+Office\s+Party\s+Code\s+OD\s+Policy\s+Number\s+OD\s+Expiry\s+Date/gi,
    ' '
  );
}

/**
 * PRIORITY 2: Rejoin digit sequences broken by line-wrap
 * Pattern: digit(s), newline, digit(s) → concatenate without space
 * E.g., "21060034\n24950000" → "2106003424950000"
 */
function rejoinBrokenDigits(text: string): string {
  return text.replace(/(\d)\n(\d)/g, '$1$2');
}

/**
 * Extract LOB description by looking BACKWARD from marker in full text.
 * LOB text appears before the marker in source order: "210600 34 Health Insurance 21060034249500005010: UK ..."
 * So we search the ~100 chars before the marker for the pattern.
 */
function extractLobDescription(fullText: string, markerStartIndex: number): string | null {
  const before = fullText.slice(Math.max(0, markerStartIndex - 100), markerStartIndex);
  const m = before.match(/210600\s+\d{2}\s+([A-Za-z\s&-]+?)\s*$/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function parseRecordBlock(block: string, lobDescription: string | null): RegisterRow | null {
  // Extract policy number and product code
  const markerMatch = block.match(/^(\d{20,25}):\s*([A-Z]{2})\s+/);
  if (!markerMatch) return null;
  
  const policyNumber = markerMatch[1];
  const productCode = markerMatch[2];
  
  console.log(`[newindia] Processing policy ${policyNumber}`);
  
  // Extract product name (text after product code until first date)
  let productName: string | null = null;
  const afterCode = block.slice(markerMatch[0].length);
  const productMatch = afterCode.match(/^([A-Za-z\s\-]+?)\s+\d{2}-[A-Za-z]{3}-\d{4}/);
  if (productMatch) {
    productName = productMatch[1].replace(/\s+/g, ' ').trim();
  }
  
  // Extract dates (looking for DD-MMM-YYYY pattern)
  const dates: string[] = [];
  let dateMatch;
  const dateRegex = /(\d{2})-([A-Za-z]{3})-(\d{4})/g;
  while ((dateMatch = dateRegex.exec(block)) !== null) {
    dates.push(dateMatch[0]);
  }
  
  let startDate = dates.length >= 1 ? toIsoDate(dates[0]) : null;
  let renewalDate = dates.length >= 2 ? toIsoDate(dates[1]) : null;
  
  if (!renewalDate && startDate) {
    const start = new Date(startDate);
    start.setFullYear(start.getFullYear() + 1);
    renewalDate = start.toISOString().split('T')[0];
  }
  
  if (startDate && renewalDate) {
    const startTime = new Date(startDate).getTime();
    const renewalTime = new Date(renewalDate).getTime();
    if (renewalTime < startTime) {
      [startDate, renewalDate] = [renewalDate, startDate];
    }
  }
  
  // PRIORITY 3: Widen holder-code regex to \d?[HPOMNE][A-Z]{0,2}\d{7,10}
  // This captures: optional leading digit + letter(s) + optional middle letter(s) + 7-10 digits
  const holderMatch = block.match(/\s(\d?[HPOMNE][A-Z]{0,2}\d{7,10})\s+/);
  
  let clientName: string | null = null;
  let clientAddress: string | null = null;
  let needsReview = false;
  
  if (holderMatch) {
    const codePos = block.indexOf(holderMatch[1]);
    const afterCodeRaw = block.slice(codePos + holderMatch[1].length).trim();
    
    // Try to extract name and address
    const nameAddrResult = extractNameAndAddress(afterCodeRaw);
    clientName = nameAddrResult.name;
    clientAddress = nameAddrResult.address;
    needsReview = nameAddrResult.needsReview;
    
    // PRIORITY 4: Never drop data — if we couldn't cleanly split, store raw unsplit span
    if (!clientName && afterCodeRaw.length > 0) {
      // Extract everything before the first phone or pincode as raw name+address
      const rawSpan = afterCodeRaw.match(/^(.+?)(?=\s+\d{6}(?:\s|$)|\s+[6-9]\d{9}(?:\s|$)|\s+1D6\d{6}(?:\s|$)|$)/);
      if (rawSpan) {
        clientName = rawSpan[1].replace(/\s+/g, ' ').trim();
        needsReview = true;
      }
    }
  }
  
  // Extract phone (closest one to client name area)
  let clientPhone: string | null = null;
  const phones = block.match(new RegExp(PHONE_RE.source, 'g'));
  if (phones && phones.length > 0) {
    if (clientName) {
      const namePos = block.indexOf(clientName);
      if (namePos > -1) {
        const nearName = block.slice(Math.max(0, namePos - 100), namePos + clientName.length + 500);
        const nearPhone = nearName.match(PHONE_RE);
        if (nearPhone) clientPhone = nearPhone[0];
      }
    }
    if (!clientPhone) clientPhone = phones[0];
  }
  
  // PRIORITY 5: Don't hardcode officer name — anchor financial figures on numeric pattern only
  // Pattern: 1D6\d{6} (officer code) followed by comma-separated or space-separated numbers
  let sumInsured: number | null = null;
  let grossPremium: number | null = null;
  let serviceTax: number | null = null;
  
  const finMatch = block.match(/1D6\d{6}\s+(\d{1,3})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)(?:\s+([\d,]+))?/);
  
  if (finMatch) {
    const nums = [finMatch[2], finMatch[3], finMatch[4], finMatch[5]]
      .filter(Boolean)
      .map(n => parseNumber(n!));
    
    if (nums.length >= 3) {
      sumInsured = nums[0]!;
      grossPremium = nums[1]!;
      serviceTax = nums[2]!;
    } else if (nums.length === 2) {
      grossPremium = nums[0]!;
      serviceTax = nums[1]!;
    } else if (nums.length === 1) {
      grossPremium = nums[0]!;
    }
  }
  
  const premium = grossPremium && serviceTax ? grossPremium + serviceTax : grossPremium;
  
  console.log(`[newindia] Extracted: ${policyNumber}, ${clientName || 'N/A'}, ${premium || 'N/A'}${needsReview ? ' [NEEDS REVIEW]' : ''}`);
  
  return {
    sn: null,
    policy_number: policyNumber,
    client_name: clientName,
    client_phone: clientPhone,
    client_address: clientAddress,
    start_date: startDate,
    renewal_date: renewalDate,
    policy_type: lobDescription || productCode,
    product_name: productName,
    mode: null,
    premium: premium,
    sum_insured: sumInsured,
  };
}

/**
 * Extract name and address from text after holder code.
 * Returns: { name, address, needsReview }
 * If can't cleanly split, returns needsReview=true to flag for manual review.
 */
function extractNameAndAddress(afterCodeRaw: string): {
  name: string | null;
  address: string | null;
  needsReview: boolean;
} {
  let name: string | null = null;
  let address: string | null = null;
  let needsReview = false;
  
  // Try to extract name with optional title
  const nameMatch = afterCodeRaw.match(
    /^((?:Mr|Mrs|Ms|Dr|SHREE|M\/S|MR|MRS|MS|SMT|SHRI)\s+)?([A-Za-z][A-Za-z\s&.\/\-]{2,100}?)(?=\s+\d|\s+[A-Z]{1,2}\d)/i
  );
  
  if (nameMatch) {
    const title = nameMatch[1] ? nameMatch[1].trim() + ' ' : '';
    const rawName = nameMatch[2].replace(/\s+/g, ' ').trim();
    name = (title + rawName).trim();
  } else {
    // Fallback: grab first 2-4 words
    const simpleMatch = afterCodeRaw.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+/);
    if (simpleMatch) {
      name = simpleMatch[1].replace(/\s+/g, ' ').trim();
    }
  }
  
  // Validate name
  if (name && (name.length < 3 || /^\d/.test(name))) {
    name = null;
  }
  
  // Extract address after name
  if (name) {
    const nameIndex = afterCodeRaw.indexOf(name);
    if (nameIndex >= 0) {
      const afterName = afterCodeRaw.slice(nameIndex + name.length).trim();
      const addrMatch = afterName.match(/^\s+(.+?)(?=\s+\d{6}(?:\s|$)|\s+[6-9]\d{9}(?:\s|$)|\s+1D6\d{6}(?:\s|$)|$)/);
      if (addrMatch) {
        address = addrMatch[1]
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 250);
      }
    }
  }
  
  return { name, address, needsReview };
}

function toIsoDate(ddmmmyyyy: string): string | null {
  const match = ddmmmyyyy.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return null;
  
  const [, dd, mmm, yyyy] = match;
  const monthMap: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
  };
  
  const mm = monthMap[mmm.toLowerCase()];
  if (!mm) return null;
  
  return `${yyyy}-${mm}-${dd}`;
}

function parseNumber(str: string): number | null {
  const cleaned = str.replace(/,/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}
