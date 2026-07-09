import type { RegisterRow } from "@/lib/types";

/**
 * Parser for TMI E-Register reports.
 * Structure: Each policy starts with "PZ" followed by 8 digits (transaction ID).
 * Format: PZ######## Date InsuranceCo Type ClientName ProposerName PolicyNo SourceCode SourceName FromDate ToDate Basic GST Surcharge OtherCharge TP TotalPremium Remarks
 */

const TRANSACTION_ID_RE = /^PZ\d{8}\s/;
const DATE_RE = /\d{2}\/\d{2}\/\d{4}/;
const PHONE_RE = /\b[6-9]\d{9}\b/;

/** Quick check: does this look like a TMI E-Register? */
export function looksLikeTMIRegister(text: string): boolean {
  const head = text.slice(0, 5000);
  const hasTMIHeader = /TMI\s+E-Register/i.test(head);
  const hasPZTransactions = (text.match(/PZ\d{8}\s/g) || []).length;
  return hasTMIHeader && hasPZTransactions >= 5;
}

/**
 * Parse the full TMI E-Register text into rows.
 * Splits by "PZ" transaction ID markers.
 */
export function parseTMIRegister(text: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  
  // Split text by transaction ID pattern (PZ followed by 8 digits)
  const chunks = text.split(/(?=PZ\d{8}\s)/);
  
  console.log(`[tmi] Found ${chunks.length} chunks to process`);
  
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (TRANSACTION_ID_RE.test(trimmed)) {
      const policy = extractPolicyFromChunk(trimmed);
      if (policy) {
        rows.push(policy);
      } else {
        console.log('[tmi] Failed to extract policy from chunk starting with:', trimmed.slice(0, 100));
      }
    }
  }
  
  console.log(`[tmi] Successfully parsed ${rows.length} policies from ${chunks.length} chunks`);
  
  // Validate: warn about missing critical fields
  const missingNames = rows.filter(r => !r.client_name).length;
  const missingDates = rows.filter(r => !r.renewal_date).length;
  const missingPremiums = rows.filter(r => !r.premium).length;
  
  if (missingNames > 0) console.warn(`[tmi] Warning: ${missingNames} policies missing client names`);
  if (missingDates > 0) console.warn(`[tmi] Warning: ${missingDates} policies missing renewal dates`);
  if (missingPremiums > 0) console.warn(`[tmi] Warning: ${missingPremiums} policies missing premiums`);
  
  return rows;
}

function extractPolicyFromChunk(fullText: string): RegisterRow | null {
  console.log(`\n[tmi] Processing chunk: ${fullText.slice(0, 150)}...`);
  
  // Structure: PZ######## ApplDate InsuranceCo PolicyType ClientName ProposerName PolicyNo SourceCode SourceName FromDate ToDate Basic GST Surcharge OtherCharge TP TotalPremium
  
  // Split by whitespace but keep some structure
  const parts = fullText.split(/\s+/);
  
  if (parts.length < 10) {
    console.log('[tmi] Too few parts, skipping');
    return null;
  }
  
  // Transaction ID (PZ12345678)
  const transactionId = parts[0]; // Not stored, just for reference
  
  // Find dates (DD/MM/YYYY format)
  const dates: string[] = [];
  const dateMatches = fullText.match(new RegExp(DATE_RE.source, 'g'));
  if (dateMatches) {
    dates.push(...dateMatches);
  }
  
  // Dates: first is application date, then From Date (start), To Date (renewal)
  const startDate = dates.length >= 2 ? toIsoDate(dates[1]) : null;
  const renewalDate = dates.length >= 3 ? toIsoDate(dates[2]) : null;
  
  // Extract insurance company (comes after first date)
  // Companies: Digit, Bajaj General, Hdfc Ergo, Tata AIG, Zuno, Generali, ICICI, Oriental, Royal Sundaram
  const companyMatch = fullText.match(/\d{2}\/\d{2}\/\d{4}\s+(Digit|Bajaj General|Hdfc Ergo|Tata AIG|Zuno|Generali|ICICI Lombard|Oriental|Royal Sundaram|Future Generali|Kotak|Star Health|Care Health|Niva Bupa|Manipal Cigna)/i);
  const company = companyMatch ? companyMatch[1].trim() : null;
  
  // Extract policy type (comes after company)
  // Types: TWO WHEELER, FOUR WHEELER, PVT CAR, HEALTH, PA INDIVIDUAL, PACKAGE, STANDALONE OD, etc.
  const typeMatch = fullText.match(/(?:Digit|Bajaj General|Hdfc Ergo|Tata AIG|Zuno|Generali|ICICI|Oriental|Royal Sundaram)\s+((?:[A-Z]+\s*){1,5}(?:PACKAGE|OD|HEALTH|INDIVIDUAL|CAR|WHEELER|MARINE|TERM))/i);
  const policyType = typeMatch ? typeMatch[1].trim() : null;
  
  // Extract client name
  // Pattern: After policy type, before policy number
  // Name appears twice (client and proposer are usually the same)
  let clientName: string | null = null;
  
  // Find the policy type, then extract the name that follows
  if (policyType) {
    const afterType = fullText.substring(fullText.indexOf(policyType) + policyType.length);
    // Name pattern: ALL CAPS, 2-50 characters, stops before policy number or source code
    const namePattern = /\s+([A-Z][A-Z\s.]+?)\s+\1\s+/; // Name appears twice (client + proposer)
    const nameMatch = afterType.match(namePattern);
    
    if (nameMatch) {
      clientName = nameMatch[1].trim();
    } else {
      // Fallback: try to extract single name before policy number patterns
      const fallbackPattern = /\s+([A-Z][A-Z\s.]{2,50}?)\s+(?:[A-Z0-9\-]{5,}|M\d{3}|P\d{3})/;
      const fallbackMatch = afterType.match(fallbackPattern);
      if (fallbackMatch) {
        clientName = fallbackMatch[1].trim();
      }
    }
  }
  
  // Extract policy number
  // Formats: D229524195, 12-8428-0000936060-00, 2866205109939603000, 710062719, etc.
  const policyPatterns = [
    /\b[A-Z]\d{9}\b/, // D229524195
    /\b\d{2}-\d{4}-\d{7,10}-\d{2}\b/, // 12-8428-0000936060-00
    /\b[A-Z]{2}-\d{2}-\d{4}-\d{4}-\d{8}\b/, // OG-26-2202-1871-00015038
    /\b\d{19}\b/, // 2866205109939603000
    /\b\d{9,10}\b/, // 710062719, 6500438114
  ];
  
  let policyNumber: string | null = null;
  for (const pattern of policyPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      policyNumber = match[0];
      break;
    }
  }
  
  // Extract phone number (might be in remarks or client data)
  const phoneMatch = fullText.match(PHONE_RE);
  const clientPhone = phoneMatch ? phoneMatch[0] : null;
  
  // Extract financial data
  // Pattern: FromDate ToDate Basic GST Surcharge OtherCharge TP TotalPremium
  // Numbers can be integers or decimals
  const financialPattern = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/;
  const finMatch = fullText.match(financialPattern);
  
  let premium: number | null = null;
  let sumInsured: number | null = null;
  
  if (finMatch) {
    // Last number is Total Premium
    premium = parseFloat(finMatch[6]);
    
    // Sum insured is not in this format - would need to be in policy details
    // For now, leave it null
  }
  
  // Log what we extracted
  console.log(`[tmi] Extracted:`, {
    transaction_id: transactionId,
    policy_number: policyNumber || '❌ MISSING',
    client_name: clientName || '❌ MISSING',
    company: company || '❌ MISSING',
    policy_type: policyType || '❌ MISSING',
    start_date: startDate || '❌ MISSING',
    renewal_date: renewalDate || '❌ MISSING',
    phone: clientPhone || '❌ MISSING',
    premium: premium || '❌ MISSING',
  });
  
  if (!policyNumber) {
    console.log('[tmi] No policy number found, skipping');
    return null;
  }
  
  return {
    sn: null,
    policy_number: policyNumber,
    client_name: clientName,
    client_phone: clientPhone,
    start_date: startDate,
    renewal_date: renewalDate,
    policy_type: policyType ? `${company} - ${policyType}` : company,
    mode: null,
    premium: premium,
    sum_insured: sumInsured,
  };
}

function toIsoDate(ddmmyyyy: string): string | null {
  const match = ddmmyyyy.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}
