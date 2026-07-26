/**
 * United India Insurance Company Limited - FLOATER Policy Parser
 * Extracts policy details from United India FLOATER health insurance policy PDFs
 * 
 * Key difference from individual policies:
 * - Floater policies cover multiple family members under ONE sum insured
 * - Policy number and previous policy number are on page 2 (POLICY DETAILS section)
 * - Must parse DETAILS OF INSURED PERSONS to extract all family members
 */

export interface FloaterMember {
  name: string;
  relation: string;
  age: number;
  sum_insured: number;
}

export interface UnitedIndiaFloaterExtraction {
  client_name: string;
  policy_number: string;
  previous_policy_number?: string | null;
  company: string;
  product_name: string;
  policy_type: string;
  sum_insured: number; // Total floater sum insured
  premium: number;
  start_date: string;
  renewal_date: string;
  client_address: string | null;
  policy_holder_type: string; // Always "Floater"
  members: FloaterMember[]; // All insured family members
  mode?: string | null;
}

/**
 * Parse United India FLOATER policy from extracted text
 */
export function parseUnitedIndiaFloaterText(text: string): UnitedIndiaFloaterExtraction {
  // Clean up text for easier parsing
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  console.log('[United India Floater] Starting parse...');
  
  // ============================================================
  // STEP 1: Extract POLICY DETAILS (Page 2)
  // ============================================================
  // CRITICAL: Extract ONLY from "POLICY DETAILS" section (page 2)
  // This section comes BEFORE "Details of Previous Policies" table (page 3+)
  // Try multiple patterns to catch different document layouts
  let policyDetailsSection = cleanText.match(/POLICY DETAILS(.{0,3000}?)(?:DETAILS OF INSURED PERSONS|Details of Previous Policies|INSURED DETAILS|$)/i);
  
  // Fallback: Try alternate header
  if (!policyDetailsSection) {
    policyDetailsSection = cleanText.match(/YOUR POLICY(.{0,3000}?)(?:DETAILS OF INSURED PERSONS|Details of Previous Policies|INSURED DETAILS|$)/i);
  }
  
  const detailsText = policyDetailsSection ? policyDetailsSection[1] : cleanText;
  
  // Extract policy number (current) - try multiple patterns
  let policy_number = '';
  
  // Pattern 1: "Policy No. : XXXXXXXXXXX"
  let policyNumberMatch = detailsText.match(/Policy\s+No\.\s*:?\s*(\d+[A-Z]\d+)/i);
  
  // Pattern 2: "YOUR POLICY No. XXXXXXXXXXX" (without colon)
  if (!policyNumberMatch) {
    policyNumberMatch = detailsText.match(/YOUR\s+POLICY\s+No\.?\s*(\d+[A-Z]\d+)/i);
  }
  
  // Pattern 3: Just search for policy number pattern in details section
  if (!policyNumberMatch) {
    policyNumberMatch = detailsText.match(/\b(0605002\d{3}[A-Z]\d{8})\b/);
  }
  
  if (policyNumberMatch) {
    policy_number = policyNumberMatch[1];
  }
  
  console.log('[United India Floater] Policy Number:', policy_number);
  
  // Extract previous policy number - try multiple patterns
  let previous_policy_number: string | null = null;
  
  // Pattern 1: "Previous Policy No. : XXXXXXXXXXX"
  let prevPolicyMatch = detailsText.match(/Previous\s+Policy\s+No\.\s*:?\s*(\d+[A-Z]\d+)/i);
  
  // Pattern 2: "Prev. Policy No. : XXXXXXXXXXX"
  if (!prevPolicyMatch) {
    prevPolicyMatch = detailsText.match(/Prev\.?\s+Policy\s+No\.?\s*:?\s*(\d+[A-Z]\d+)/i);
  }
  
  // Pattern 3: "Renewed from : XXXXXXXXXXX"
  if (!prevPolicyMatch) {
    prevPolicyMatch = detailsText.match(/Renewed\s+from\s*:?\s*(\d+[A-Z]\d+)/i);
  }
  
  if (prevPolicyMatch) {
    previous_policy_number = prevPolicyMatch[1];
  }
  
  console.log('[United India Floater] Previous Policy Number:', previous_policy_number);
  
  // ============================================================
  // STEP 2: Extract Policyholder Name
  // ============================================================
  let client_name = '';
  const nameMatch = cleanText.match(/Policyholder Name\s*:?\s*([A-Z][A-Z\s.]+?)(?:\s+Policyholder ID|\s+Address|\s+AHMADABAD|\s+Tel|$)/i);
  if (nameMatch) {
    client_name = nameMatch[1]
      .replace(/^(MR|MRS|MS|DR)\.?\s+(MR|MRS|MS|DR)\.?\s+/i, '')
      .replace(/^(MR|MRS|MS|DR)\.?\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.$/, '');
  }
  
  console.log('[United India Floater] Client Name:', client_name);
  
  // ============================================================
  // STEP 3: Extract Product Name (Floater Mediclaim)
  // ============================================================
  let product_name = 'Floater Mediclaim';
  
  // Check for plan type (Platinum/Gold/Silver)
  const planMatch = cleanText.match(/\b(Platinum|Gold|Silver)\b/i);
  if (planMatch) {
    product_name = `Floater Mediclaim - ${planMatch[1]}`;
  }
  
  // Check if it's specifically mentioned as floater
  if (cleanText.match(/floater\s+mediclaim/i)) {
    product_name = planMatch ? `Floater Mediclaim - ${planMatch[1]}` : 'Floater Mediclaim';
  }
  
  console.log('[United India Floater] Product Name:', product_name);
  
  // ============================================================
  // STEP 4: Extract Dates (Period of Insurance)
  // ============================================================
  let start_date = '';
  let renewal_date = '';
  
  // Try multiple patterns to catch different date formats
  let periodMatch = cleanText.match(/Period of Insurance\s*:?\s*From[^0-9]*?(\d{2}\/\d{2}\/\d{4})[^T]*?To[^0-9]*?(\d{2}\/\d{2}\/\d{4})/i);
  if (!periodMatch) {
    periodMatch = cleanText.match(/Period\s*:?\s*From[^0-9]*?(\d{2}\/\d{2}\/\d{4})[^T]*?To[^0-9]*?(\d{2}\/\d{2}\/\d{4})/i);
  }
  if (!periodMatch) {
    periodMatch = cleanText.match(/From[^0-9]*?(\d{2}\/\d{2}\/\d{4})[^T]*?To[^0-9]*?on\s*(\d{2}\/\d{2}\/\d{4})/i);
  }
  if (!periodMatch) {
    // Try alternative: From 00:00 hrs of DD/MM/YYYY To Midnight on DD/MM/YYYY
    periodMatch = cleanText.match(/From\s+(?:00:00\s+hrs?\s+of\s+)?(\d{2}\/\d{2}\/\d{4})[^T]*?To\s+(?:Midnight\s+on\s+)?(\d{2}\/\d{2}\/\d{4})/i);
  }
  if (periodMatch) {
    start_date = periodMatch[1];
    renewal_date = periodMatch[2];
  }
  
  console.log('[United India Floater] Start Date:', start_date, 'Renewal Date:', renewal_date);
  
  // ============================================================
  // STEP 5: Extract Address
  // ============================================================
  let client_address = null;
  const addressMatch = cleanText.match(/Address\s*:?\s*(.+?)(?:\s+(?:AHMADABAD|AHMEDABAD|Tel|Mobile|Fax|E-Mail|Business|Period of Insurance))/i);
  if (addressMatch) {
    client_address = addressMatch[1]
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/DIST\.\s*:/gi, 'DIST:')
      .replace(/\s+,/g, ',')
      .trim();
  }
  
  console.log('[United India Floater] Address:', client_address);
  
  // ============================================================
  // STEP 6: Extract FLOATER Sum Insured (ONE total for all members)
  // ============================================================
  let sum_insured = 0;
  
  // Floater policies have ONE sum insured for the entire family
  // Look in SUMMARY OF COVERAGE section
  const coverageSection = cleanText.match(/SUMMARY OF COVERAGE(.{0,2000}?)(?:PREMIUM BREAK DOWN|PAYMENT DETAILS)/i);
  if (coverageSection) {
    // Look for "Sum Insured" followed by amount
    const sumMatch = coverageSection[1].match(/Sum Insured[^0-9]*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
    if (sumMatch) {
      sum_insured = parseFloat(sumMatch[1].replace(/,/g, ''));
    }
  }
  
  // Fallback: Look in policy details section
  if (sum_insured === 0) {
    const sumMatch = detailsText.match(/Sum Insured[^0-9]*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
    if (sumMatch) {
      sum_insured = parseFloat(sumMatch[1].replace(/,/g, ''));
    }
  }
  
  console.log('[United India Floater] Total Sum Insured:', sum_insured);
  
  // ============================================================
  // STEP 7: Extract Premium (Total)
  // ============================================================
  let premium = 0;
  
  // Look in PAYMENT DETAILS section for final total
  const paymentSection = cleanText.match(/PAYMENT DETAILS(.{0,1500})(?:Receipt Number|Receipt Date|INTERMEDIARY)/i);
  if (paymentSection) {
    // Get the LAST Total (final amount after all additions)
    const totalMatches = [...paymentSection[1].matchAll(/Total\s*:?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi)];
    if (totalMatches.length > 0) {
      const lastTotal = totalMatches[totalMatches.length - 1];
      premium = parseFloat(lastTotal[1].replace(/,/g, ''));
    }
  }
  
  // Fallback: try to get from Premium Break Down total
  if (premium === 0) {
    const breakdownMatch = cleanText.match(/Total Annual Premium[^\d]*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
    if (breakdownMatch) {
      premium = parseFloat(breakdownMatch[1].replace(/,/g, ''));
    }
  }
  
  console.log('[United India Floater] Total Premium:', premium);
  
  // ============================================================
  // STEP 8: Extract DETAILS OF INSURED PERSONS (All Family Members)
  // ============================================================
  const members: FloaterMember[] = [];
  
  const insuredPersonsSection = cleanText.match(/DETAILS OF INSURED PERSONS(.{0,3000}?)(?:SUMMARY OF COVERAGE|PREMIUM BREAK DOWN)/i);
  if (insuredPersonsSection) {
    const sectionText = insuredPersonsSection[1];
    
    // Parse table rows - look for entries with Date of Birth and Age
    // Pattern: [Number] NAME Relation DOB Age Gender [Sum]
    // Example: "1 MR JOHN DOE Self 15/05/1976 50 Male 500,000.00"
    //          "2 MRS JANE DOE Spouse 10/08/1978 48 Female 500,000.00"
    
    // Match pattern: number, optional prefix (MR/MRS/MS/DR), first name, last name, relation, DOB, age, gender
    // Use lookahead to capture full name properly
    const nameMatches = sectionText.matchAll(/\d+\s+(?:MR|MRS|MS|DR)?\s*([A-Z]{1,}\s+[A-Z]{1,})\s+(Self|Spouse|Son|Daughter|Father|Mother|Brother|Sister)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,3})\s+(?:Male|Female)/gi);
    
    for (const match of nameMatches) {
      let name = match[1].trim();
      const relation = match[2];
      const age = parseInt(match[6], 10);
      
      // Validate age is reasonable
      if (age >= 0 && age <= 120) {
        members.push({
          name,
          relation,
          age,
          sum_insured: sum_insured,
        });
      }
    }
    
    // Fallback: If no members found with full pattern, try without Gender
    if (members.length === 0) {
      const matchesNoGender = sectionText.matchAll(/\d+\s+(?:MR|MRS|MS|DR)?\s*([A-Z]{1,}\s+[A-Z]{1,})\s+(Self|Spouse|Son|Daughter|Father|Mother|Brother|Sister)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,3})/gi);
      
      for (const match of matchesNoGender) {
        let name = match[1].trim();
        const relation = match[2];
        const age = parseInt(match[5], 10);
        
        if (age >= 0 && age <= 120) {
          members.push({
            name,
            relation,
            age,
            sum_insured: sum_insured,
          });
        }
      }
    }
  }
  
  console.log('[United India Floater] Extracted Members:', members.length);
  members.forEach(m => console.log(`  - ${m.name} (${m.relation}, Age: ${m.age}`));
  
  // ============================================================
  // STEP 9: Validate Required Fields
  // ============================================================
  if (!client_name || !policy_number) {
    throw new Error("Could not extract required fields: client_name and policy_number");
  }
  
  if (members.length === 0) {
    console.warn('[United India Floater] WARNING: No family members extracted!');
  }
  
  return {
    client_name,
    policy_number,
    previous_policy_number,
    company: "United India Insurance",
    product_name,
    policy_type: "Health Insurance",
    sum_insured,
    premium,
    start_date,
    renewal_date,
    client_address,
    policy_holder_type: "Floater",
    members,
  };
}

/**
 * Quick validation check for United India Floater policies
 * Must match the same patterns as the detector!
 */
export function isUnitedIndiaFloaterPolicy(text: string): boolean {
  const lowerText = text.toLowerCase();
  const isUnitedIndia = lowerText.includes("united india insurance") ||
     lowerText.includes("uiic.co.in") ||
     (lowerText.includes("irdai reg") && lowerText.includes("545"));
  
  if (!isUnitedIndia) return false;
  
  // Check for ANY floater/family indicators (match detector patterns)
  const hasFloaterIndicator = /family\s+medicare\s+policy|family\s+floater|floater\s+mediclaim|policy\s+type\s*:?\s*family\s+floater|floater.*(?:family|group)|(?:family|group).*floater/i.test(text);
  const hasFamilyMembers = /details?\s+of\s+(?:the\s+)?insured\s+(?:persons?|members?)|insured\s+details?/i.test(text);
  
  return hasFloaterIndicator || hasFamilyMembers;
}
