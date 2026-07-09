import type { RegisterRow } from "@/lib/types";

/**
 * Deterministic parser for New India Assurance "Policy Expiry Register" reports.
 * These have a fixed structure with policies starting with "210600" (operating office code).
 * 
 * NOTE: Many New India PDFs extract as one giant line with spaces instead of newlines.
 */

const POLICY_NUMBER_RE = /\b\d{20,25}\b/; // New India policy numbers are 20-25 digits
const DATE_RE = /(\d{2})-([A-Za-z]{3})-\s*(\d{4})/; // DD-MMM- YYYY format
const PHONE_RE = /\b[6-9]\d{9}\b/; // Indian mobile numbers

/** Quick check: does this look like a New India register? */
export function looksLikeNewIndiaRegister(text: string): boolean {
  const head = text.slice(0, 8000);
  const hasHeader = /policy\s*expiry\s*register/i.test(head) && /new\s*india/i.test(head);
  const policyNumbers = (text.match(/\b\d{20,25}\b/g) || []).length;
  return hasHeader && policyNumbers >= 5;
}

/**
 * Parse the full New India register text into rows.
 * Splits on "210600" markers (operating office code) to identify each policy.
 */
export function parseNewIndiaRegister(text: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  
  // Split text by the operating office code "210600"
  // Handle both cases: separate lines and continuous text
  const chunks = text.split(/(?=210600\s+(?:34|11|31|36)\s+)/);
  
  console.log(`[newindia] Found ${chunks.length} chunks to process`);
  
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed.startsWith("210600")) {
      const policy = extractPolicyFromChunk(trimmed);
      if (policy) {
        rows.push(policy);
      } else {
        console.log('[newindia] Failed to extract policy from chunk starting with:', trimmed.slice(0, 100));
      }
    }
  }
  
  console.log(`[newindia] Successfully parsed ${rows.length} policies from ${chunks.length} chunks`);
  
  // Validate: warn about missing critical fields
  const missingNames = rows.filter(r => !r.client_name).length;
  const missingDates = rows.filter(r => !r.renewal_date).length;
  const missingPremiums = rows.filter(r => !r.premium).length;
  
  if (missingNames > 0) console.warn(`[newindia] Warning: ${missingNames} policies missing client names`);
  if (missingDates > 0) console.warn(`[newindia] Warning: ${missingDates} policies missing renewal dates`);
  if (missingPremiums > 0) console.warn(`[newindia] Warning: ${missingPremiums} policies missing premiums`);
  
  return rows;
}

function extractPolicyFromChunk(fullText: string): RegisterRow | null {
  // Extract policy number (20-25 digits)
  const policyMatch = fullText.match(POLICY_NUMBER_RE);
  const policyNumber = policyMatch ? policyMatch[0] : null;
  
  if (!policyNumber) {
    console.log('[newindia] Skipping chunk - no policy number found');
    return null;
  }
  
  console.log(`[newindia] Processing policy ${policyNumber}`);
  
  // Extract plan name (product name after LOB code)
  // LOB codes: 34 (MOTOR), 11, 31, 36 (various product lines)
  // Pattern: LOB_CODE PRODUCT_NAME policy_number
  const planMatch = fullText.match(/(?:34|11|31|36)\s+([A-Z][A-Za-z\s\-&().]+?)\s+\d{20,25}/);
  let rawPlan = planMatch ? planMatch[1].trim() : null;
  
  // If not found, try alternative pattern (sometimes product name comes after different markers)
  if (!rawPlan) {
    const altPlanMatch = fullText.match(/210600\s+(?:34|11|31|36)\s+([A-Z][A-Za-z\s\-&().]+?)(?=\s+\d{20,25})/);
    rawPlan = altPlanMatch ? altPlanMatch[1].trim() : null;
  }
  
  // Clean up plan name
  if (rawPlan) {
    rawPlan = rawPlan
      .replace(/\s+/g, ' ') // normalize spaces
      .replace(/\s+$/, '') // trim trailing
      .trim();
  }
  
  // Extract dates
  const dates = [];
  let match;
  const dateRegex = new RegExp(DATE_RE.source, 'g');
  while ((match = dateRegex.exec(fullText)) !== null) {
    // Only add dates that have a valid year (4 digits)
    if (match[3] && match[3].length === 4) {
      dates.push(match[0]);
    }
  }
  
  // For MOTOR policies, dates might be in format "28-Jan- 27-Jan-" (no year on second date)
  // In that case, use first date for both start and calculate renewal
  let startDate = dates.length >= 1 ? toIsoDate(dates[0]) : null;
  let renewalDate = dates.length >= 2 ? toIsoDate(dates[1]) : null;
  
  // If renewal date is null but we have a start date, add 1 year (most insurance policies are annual)
  if (!renewalDate && startDate) {
    const start = new Date(startDate);
    start.setFullYear(start.getFullYear() + 1);
    renewalDate = start.toISOString().split('T')[0];
  }
  
  // Validate dates: renewal should be after start
  if (startDate && renewalDate) {
    const startTime = new Date(startDate).getTime();
    const renewalTime = new Date(renewalDate).getTime();
    
    // If renewal is before start, they might be swapped
    if (renewalTime < startTime) {
      [startDate, renewalDate] = [renewalDate, startDate];
    }
  }
  
  // Extract insured name - robust extraction
  let clientName: string | null = null;
  
  // Find holder code: can be split across space like "POA268198 5" or contiguous like "H3686438"
  // Patterns: H3686438, PO65265150, POA2681985 (or POA268198 5), POB9710485 (or POB971048 5), ME15535790 (or ME1553579 0)
  const holderCodeMatch = fullText.match(/\s([HPM][A-Z]?\d{7,8})\s*(\d?)\s/);
  
  if (holderCodeMatch) {
    const codeEndIndex = fullText.indexOf(holderCodeMatch[0]) + holderCodeMatch[0].length;
    const afterCode = fullText.slice(codeEndIndex, codeEndIndex + 400);
    
    // Name pattern: optional title + name (ALL CAPS, spaces, can start with numbers like "MS VINIT" or be just numbers like "APCO")
    // IMPORTANT: Names are ALL CAPS. Stops before address which has specific patterns:
    // - Pure digits 2+ in a row (like "4111", "25781", "58691", "19 ", but NOT single digit like "5 ")
    // - Specific address keywords
    // - Mixed case/format changes (but names in this PDF are all caps)
    const namePattern = /^(?:Mr |Mrs |Ms |Dr |SHREE |M\/S |MR |MRS |MS |SMT |SHRI )?([A-Z0-9][A-Z0-9\s&.,-]*?)(?=\s+(?:\d{2,}(?:\s|\/|,)|WING|ROOM|FLAT|BNO|BLOCK|B\d+|A\d+|\d+TH|ZAVERI|KAPASI|KRISHNA|FLOOR|D\d+|ESTATE|COMPOUND|[A-Z]\d{3,}|PLOT|ROAD|STREET|LANE|BUILDING|HOUSE|SURVEY|NEAR|OPP|BEHIND|CHAWL|SOCIETY|CO-OP|JUHU|ANDHERI|BANDRA|WORLI|KURLA|POWAI|GHATKOPAR|BORIVALI|DAHISAR|MALAD|GOREGAON|KANDIVALI|JOGESHWARI|VILE|SANTACRUZ|KHAR|KALINA|SAHAR|MAHIM|WADALA|CHEMBUR|VIKHROLI|MULUND|BHANDUP|KANJUR|THANE|NAVI|MUMBAI|PRABHADEVI|DADAR|MATUNGA|SION|KINGS|LOWER|UPPER|TARDEO|GRANT|MARINE|MALABAR|PEDDAR|NARIMAN|COLABA|FORT|CHURCHGATE|CST|BALLARD))/i;
    const nameMatch = afterCode.match(namePattern);
    
    if (nameMatch) {
      clientName = nameMatch[1].trim();
      // Clean up the name
      clientName = clientName
        .replace(/\s+/g, ' ') // normalize spaces
        .replace(/\s+([,.\-&])/, '$1') // remove space before punctuation
        .replace(/([,.\-&])\s*$/, '') // remove trailing punctuation
        .trim();
      
      // Remove trailing single characters that are not part of the name
      if (clientName.match(/\s[A-Z0-9]$/)) {
        const withoutLast = clientName.replace(/\s[A-Z0-9]$/, '').trim();
        // Only remove if the result is still a reasonable name (at least 3 chars)
        if (withoutLast.length >= 3) {
          clientName = withoutLast;
        }
      }
      
      // Additional cleanup: if name contains obvious address markers mid-string, truncate
      const addressMarkerMatch = clientName.match(/^(.+?)\s+(?:\d{1,4}[A-Z][A-Z\s]+|APTS?|SOC\b|NAGAR|COLONY|RESIDENC)/i);
      if (addressMarkerMatch && addressMarkerMatch[1].length >= 5) {
        clientName = addressMarkerMatch[1].trim();
      }
    }
  }
  
  // Fallback: try alternative pattern if no name found yet
  if (!clientName) {
    // Look for pattern: policy_number followed by name before address markers
    const afterPolicy = fullText.slice(fullText.indexOf(policyNumber!) + policyNumber!.length, fullText.indexOf(policyNumber!) + policyNumber!.length + 500);
    const fallbackPattern = /:\s*([A-Z][A-Z0-9\s&.,-]{2,80}?)(?=\s+(?:\d{2,}(?:\s|\/)|WING|ROOM|FLAT|PLOT|ROAD|STREET|LANE|BUILDING|HOUSE|NEAR|OPP))/i;
    const fallbackMatch = afterPolicy.match(fallbackPattern);
    if (fallbackMatch) {
      clientName = fallbackMatch[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  // Extract phone - find all mobile numbers and pick the best one
  const phoneMatches = fullText.match(new RegExp(PHONE_RE.source, 'g'));
  let clientPhone: string | null = null;
  
  if (phoneMatches && phoneMatches.length > 0) {
    // If multiple numbers found, prefer one closer to the name/policy area
    // For now, take the first valid one
    clientPhone = phoneMatches[0];
    
    // If we have the client name, try to find a phone number near it
    if (clientName) {
      const nameIndex = fullText.indexOf(clientName);
      if (nameIndex !== -1) {
        const nearName = fullText.slice(Math.max(0, nameIndex - 100), nameIndex + clientName.length + 200);
        const nearPhones = nearName.match(PHONE_RE);
        if (nearPhones && nearPhones.length > 0) {
          clientPhone = nearPhones[0];
        }
      }
    }
  }
  
  // Extract financial numbers
  // Pattern: ... MANOJ C GILDER [numbers] ...
  // Can be 3 or 4 numbers (with or without dev code)
  // Numbers can have commas or not: 100,000 or 100000
  // Also check for alternative patterns if GILDER not found
  
  let sumInsured: number | null = null;
  let grossPremium: number | null = null;
  let serviceTax: number | null = null;
  
  // Primary pattern: Match 3-4 numbers after GILDER/MANOJ
  const financialPattern = /(?:GILDER|MANOJ|C\s+GILDER)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)(?:\s+([\d,]+))?/;
  let finMatch = fullText.match(financialPattern);
  
  // Fallback: Look for sequence of 3-4 numbers (comma-formatted or plain) near policy number
  if (!finMatch) {
    const afterPolicyIndex = fullText.indexOf(policyNumber!) + policyNumber!.length;
    const searchArea = fullText.slice(afterPolicyIndex, afterPolicyIndex + 500);
    const fallbackPattern = /([\d,]+)\s+([\d,]+)\s+([\d,]+)(?:\s+([\d,]+))?/;
    finMatch = searchArea.match(fallbackPattern);
  }
  
  if (finMatch) {
    const nums = [finMatch[1], finMatch[2], finMatch[3], finMatch[4]]
      .filter(Boolean)
      .map(n => parseNumber(n!));
    
    if (nums.length === 4) {
      // 4 numbers: check if first is dev code (< 1000)
      if (nums[0]! < 1000) {
        // Skip dev code
        sumInsured = nums[1]!;
        grossPremium = nums[2]!;
        serviceTax = nums[3]!;
      } else {
        // No dev code - could be: dev_code, sum_insured, gross_premium, service_tax
        // or sum_insured, gross_premium, service_tax, total
        // Check if last number is sum of previous two (indicating it's a total)
        if (nums[3] === nums[1]! + nums[2]!) {
          // Last is total, so: sum_insured, gross_premium, service_tax, total
          sumInsured = nums[0]!;
          grossPremium = nums[1]!;
          serviceTax = nums[2]!;
        } else {
          // Normal case
          sumInsured = nums[0]!;
          grossPremium = nums[1]!;
          serviceTax = nums[2]!;
        }
      }
    } else if (nums.length === 3) {
      // 3 numbers: check if last is sum of first two (total)
      if (nums[2] === nums[0]! + nums[1]!) {
        // Pattern: gross_premium, service_tax, total (no sum insured)
        grossPremium = nums[0]!;
        serviceTax = nums[1]!;
      } else {
        // Pattern: sum_insured, gross_premium, service_tax
        sumInsured = nums[0]!;
        grossPremium = nums[1]!;
        serviceTax = nums[2]!;
      }
    } else if (nums.length === 2) {
      // 2 numbers: likely gross_premium and service_tax
      grossPremium = nums[0]!;
      serviceTax = nums[1]!;
    } else if (nums.length === 1) {
      // Single number: likely total premium
      grossPremium = nums[0]!;
    }
  }
  
  // Total premium = gross premium + service tax (if both available)
  const premium = grossPremium && serviceTax ? grossPremium + serviceTax : grossPremium;
  
  // Log what we extracted for debugging
  console.log(`[newindia] Extracted:`, {
    policy_number: policyNumber,
    client_name: clientName || 'MISSING',
    policy_type: rawPlan || 'MISSING',
    start_date: startDate || 'MISSING',
    renewal_date: renewalDate || 'MISSING',
    phone: clientPhone || 'MISSING',
    premium: premium || 'MISSING',
    sum_insured: sumInsured || 'MISSING',
  });
  
  return {
    sn: null,
    policy_number: policyNumber,
    client_name: clientName,
    client_phone: clientPhone,
    start_date: startDate,
    renewal_date: renewalDate,
    policy_type: rawPlan,
    mode: null,
    premium: premium,
    sum_insured: sumInsured,
  };
}

function toIsoDate(ddmmmyyyy: string): string | null {
  const match = ddmmmyyyy.match(/(\d{2})-([A-Za-z]{3})-?\s*(\d{4})/);
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
