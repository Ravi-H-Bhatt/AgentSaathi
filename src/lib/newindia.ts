import type { RegisterRow } from "@/lib/types";
import Groq from "groq-sdk";

/**
 * New India Assurance Policy Expiry Register Parser
 * 
 * HYBRID APPROACH:
 * - Regex for deterministic record chunking (fast, reliable for boundaries)
 * - LLM for ambiguous field extraction (name/address split, missing fields)
 * 
 * This handles edge cases regex alone cannot solve:
 * - Name/address with no clear delimiter
 * - Missing fields that should be flagged vs truly absent
 * - Records with unusual formatting
 */

const POLICY_MARKER_RE = /(\d{20,25}):\s*([A-Z]{2})\s+/;

// Lazy-init Groq client to ensure env is loaded
let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqClient;
}

export function looksLikeNewIndiaRegister(text: string): boolean {
  const head = text.slice(0, 8000);
  const hasHeader = /policy\s*expiry\s*register/i.test(head) && /new\s*india/i.test(head);
  const policyNumbers = (text.match(/\d{20,25}:\s*[A-Z]{2}\s+/g) || []).length;
  return hasHeader && policyNumbers >= 5;
}

export async function parseNewIndiaRegister(text: string): Promise<RegisterRow[]> {
  console.log(`[newindia] Using FAST coordinate-based extraction (no LLM)`);
  
  // For coordinate extraction, we need the buffer not text
  // This function is kept for compatibility but should use parseNewIndiaRegisterFast
  // when called from the API with buffer access
  
  // Fallback to regex chunking if only text is available
  console.warn('[newindia] Text-only mode - some fields may be incomplete. Use buffer for best results.');
  
  // Quick regex extraction as fallback
  const policyMatches = Array.from(text.matchAll(/(\d{20,25}):\s*([A-Z]{2})/g));
  
  return policyMatches.map(match => ({
    sn: null,
    policy_number: match[1],
    client_name: null,
    client_phone: null,
    client_address: null,
    start_date: null,
    renewal_date: null,
    policy_type: match[2],
    product_name: null,
    mode: null,
    premium: null,
    sum_insured: null,
  }));
}

/**
 * Extract LOB description by looking BACKWARD from marker in full text.
 */
function extractLobDescription(fullText: string, markerStartIndex: number): string | null {
  const before = fullText.slice(Math.max(0, markerStartIndex - 100), markerStartIndex);
  const m = before.match(/210600\s+\d{2}\s+([A-Za-z\s&-]+?)\s*$/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/**
 * Validate that mandatory fields are present
 */
function validateRecord(record: RegisterRow): { valid: boolean; missing: string[] } {
  const REQUIRED_FIELDS = ['policy_number', 'client_name', 'policy_type', 'product_name', 'sum_insured'];
  const missing = REQUIRED_FIELDS.filter(field => {
    const value = record[field as keyof RegisterRow];
    return value === null || value === undefined || value === '';
  });
  
  return { valid: missing.length === 0, missing };
}

/**
 * Use LLM to extract structured fields from record blocks.
 * Handles ambiguous boundaries (name vs address) that regex cannot reliably split.
 * WITH VALIDATION: Ensures all mandatory fields are extracted.
 */
async function extractBatchWithLLM(
  batch: Array<{
    block: string;
    policyNumber: string;
    productCode: string;
    lobDescription: string | null;
  }>,
  attempt: number = 1
): Promise<RegisterRow[]> {
  const numbered = batch.map((b, i) => 
    `RECORD ${i}:
Policy Number: ${b.policyNumber}
Product Code: ${b.productCode}
LOB Description: ${b.lobDescription || "Unknown"}
Text: ${b.block}`
  ).join("\n\n");
  
  // Debug: log first record to see what LLM receives
  if (attempt === 1) {
    console.log('[newindia] Sample block being sent to LLM:', batch[0].block.substring(0, 300));
  }

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: attempt > 1 ? 0.1 : 0,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: `Extract insurance policy data and return as JSON.

Each record follows this pattern:
[Policy Number]: [Code] [Product Name] [Start Date] [End Date] [Holder Code] [CLIENT NAME] [Address parts...] [Pin] [Phone] [Officer Code] [Officer Name] [Agent Code] [Sum Insured] [Premium] [Tax]

Return JSON with exactly this structure:
{
  "records": [
    {
      "index": 0,
      "client_name": "FULL NAME IN CAPS",
      "client_address": "combined address",
      "client_phone": "10-digit mobile",
      "product_name": "Product name after colon",
      "start_date": "YYYY-MM-DD",
      "renewal_date": "YYYY-MM-DD", 
      "premium": number,
      "sum_insured": number,
      "mode": "payment mode"
    }
  ]
}

EXTRACTION RULES:
1. client_name: Name in CAPS after holder code (e.g., "RAMESH D PATEL", "Mr TARANG K PATEL")
2. product_name: Text after product code (e.g., "New India Mediclaim Policy")
3. sum_insured: Large number before premium
4. Remove commas from numbers
5. Convert dates "03-Jan-2025" to "2025-01-03"
6. Phone: 10 digits starting with 6-9
7. Extract ALL fields or use null

Extract from these ${batch.length} records:

${numbered}`
    }]
  });

  const response = JSON.parse(completion.choices[0].message.content || '{}');
  
  if (!response.records || response.records.length !== batch.length) {
    throw new Error(`LLM returned ${response.records?.length || 0} records, expected ${batch.length}`);
  }

  const results: RegisterRow[] = response.records.map((record: any, i: number) => ({
    sn: null,
    policy_number: batch[i].policyNumber,
    client_name: record.client_name || null,
    client_phone: record.client_phone || null,
    client_address: record.client_address || null,
    start_date: record.start_date || null,
    renewal_date: record.renewal_date || null,
    policy_type: batch[i].lobDescription || batch[i].productCode,
    product_name: record.product_name || null,
    mode: record.mode || null,
    premium: record.premium || null,
    sum_insured: record.sum_insured || null,
  }));
  
  // Validate results
  const incompleteRecords = results.filter((r, i) => {
    const validation = validateRecord(r);
    if (!validation.valid) {
      console.log(`[newindia] Record ${i} missing fields: ${validation.missing.join(', ')}`);
    }
    return !validation.valid;
  });
  
  // If any records are incomplete and we haven't exhausted retries, retry the batch
  if (incompleteRecords.length > 0 && attempt < 2) {
    console.log(`[newindia] Batch has ${incompleteRecords.length} incomplete records, retrying (attempt ${attempt + 1})...`);
    return extractBatchWithLLM(batch, attempt + 1);
  }
  
  return results;
}

/**
 * Strip repeated header blocks
 */
function stripMidtextHeaders(text: string): string {
  return text.replace(
    /Operating\s+Office\s+Code\s+Operating\s+Office\s+Party\s+Code\s+OD\s+Policy\s+Number\s+OD\s+Expiry\s+Date/gi,
    ' '
  );
}

/**
 * Rejoin digit sequences broken by line-wrap
 */
function rejoinBrokenDigits(text: string): string {
  return text.replace(/(\d)\n(\d)/g, '$1$2');
}
