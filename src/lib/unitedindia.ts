/**
 * United India Insurance Company Limited parser
 * Extracts policy details from United India health insurance policy PDFs using text parsing
 */

export interface UnitedIndiaExtraction {
  client_name: string;
  policy_number: string;
  previous_policy_number?: string | null;
  company: string;
  product_name: string;
  policy_type: string;
  sum_insured: number;
  premium: number;
  start_date: string;
  renewal_date: string;
  client_address: string | null;
  policy_holder_type: string | null;
  mode?: string | null;
}

/**
 * Parse United India policy from extracted text
 */
export function parseUnitedIndiaText(text: string): UnitedIndiaExtraction {
  // Clean up text for easier parsing
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // CRITICAL: Extract ONLY from "POLICY DETAILS" section (page 2)
  // This section comes BEFORE "Details of Previous Policies" table (page 3)
  // We want to avoid picking up old policy numbers from the history table
  const policyDetailsSection = cleanText.match(/POLICY DETAILS(.{0,1500}?)(?:Details of Previous Policies|INDIVIDUAL HEALTH INSURANCE POLICY CUSTOMER|$)/i);
  const detailsText = policyDetailsSection ? policyDetailsSection[1] : cleanText;
  
  // Extract policy number (current) - only from Policy Details section
  const policyNumberMatch = detailsText.match(/Policy No\.\s*:?\s*(\d+[A-Z]\d+)/i) ||
                            cleanText.match(/YOUR POLICY No\.\s*(\d+[A-Z]\d+)/i);
  const policy_number = policyNumberMatch?.[1] || '';
  
  // Extract previous policy number - only from Policy Details section
  const prevPolicyMatch = detailsText.match(/Previous Policy No\.\s*:?\s*(\d+[A-Z]\d+)/i);
  const previous_policy_number = prevPolicyMatch?.[1] || null;
  
  // Extract policyholder name
  let client_name = '';
  const nameMatch = cleanText.match(/Policyholder Name\s*:?\s*([A-Z\s.]+?)(?:\s+Policyholder ID|$)/i);
  if (nameMatch) {
    client_name = nameMatch[1]
      .replace(/^(MR|MRS|MS|DR)\.?\s+(MR|MRS|MS|DR)\.?\s+/i, '')
      .replace(/^(MR|MRS|MS|DR)\.?\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.$/, '');
  }
  
  // Extract product name - check for different policy types
  let product_name = 'Individual Health Insurance';
  
  // Check for Family Medicare Policy
  if (cleanText.match(/FAMILY MEDICARE POLICY/i)) {
    product_name = 'Family Medicare Policy';
  } else if (cleanText.match(/INDIVIDUAL HEALTH INSURANCE POLICY/i)) {
    // Try to find plan in SUMMARY OF COVERAGE section
    const coverageSection = cleanText.match(/SUMMARY OF COVERAGE(.{0,500}?)PREMIUM BREAK DOWN/i);
    if (coverageSection) {
      const planMatch = coverageSection[1].match(/\b(Platinum|Gold|Silver)\b/i);
      if (planMatch) {
        product_name = `Individual Health Insurance - ${planMatch[1]}`;
      }
    }
    // Fallback: look anywhere in document
    if (product_name === 'Individual Health Insurance') {
      const planMatch = cleanText.match(/\b(Platinum|Gold|Silver)\b/i);
      if (planMatch) {
        product_name = `Individual Health Insurance - ${planMatch[1]}`;
      }
    }
  }
  
  // Extract dates (Period of Insurance) - handle various formats
  let start_date = '';
  let renewal_date = '';
  // Try multiple patterns to catch different date formats
  let periodMatch = cleanText.match(/Period of Insurance\s*:?\s*From[^0-9]*?(\d{2}\/\d{2}\/\d{4})[^T]*?To[^0-9]*?(\d{2}\/\d{2}\/\d{4})/i);
  if (!periodMatch) {
    // Try without "of Insurance"
    periodMatch = cleanText.match(/Period\s*:?\s*From[^0-9]*?(\d{2}\/\d{2}\/\d{4})[^T]*?To[^0-9]*?(\d{2}\/\d{2}\/\d{4})/i);
  }
  if (!periodMatch) {
    // Try with "on" instead of exact date position
    periodMatch = cleanText.match(/From[^0-9]*?(\d{2}\/\d{2}\/\d{4})[^T]*?To[^0-9]*?on\s*(\d{2}\/\d{2}\/\d{4})/i);
  }
  if (periodMatch) {
    start_date = periodMatch[1];
    renewal_date = periodMatch[2];
  }
  
  // Extract address - improved to capture full address including multi-line
  let client_address = null;
  const addressMatch = cleanText.match(/Address\s*:?\s*(.+?)(?:\s+(?:AHMADABAD|AHMEDABAD|Tel|Mobile|Fax|E-Mail|Business))/i);
  if (addressMatch) {
    client_address = addressMatch[1]
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/DIST\.\s*:/gi, 'DIST:')
      .replace(/\s+,/g, ',')
      .trim();
  }
  
  // Extract sum insured - handle both Individual and Family Floater formats
  let sum_insured = 0;
  
  // For Family Floater: look for "Family Floater SI" in the table
  const floaterSIMatch = cleanText.match(/Family Floater SI\s*[₹()\s]*\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  if (floaterSIMatch) {
    sum_insured = parseFloat(floaterSIMatch[1].replace(/,/g, ''));
  } else {
    // For Individual policies: sum all member sum insured
    const sumInsuredMatches = cleanText.match(/Sum Insured[^0-9]+?((?:\d{1,3},)*\d{3,}(?:\.\d{2})?)/gi);
    if (sumInsuredMatches) {
      // Find all sum insured values in the coverage section
      const coverageSection = cleanText.match(/SUMMARY OF COVERAGE(.{0,2000}?)PREMIUM BREAK DOWN/i);
      if (coverageSection) {
        const amounts = coverageSection[1].match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
        if (amounts) {
          // Sum all amounts that look like sum insured (typically 50000-10000000)
          amounts.forEach(amt => {
            const val = parseFloat(amt.replace(/,/g, ''));
            if (val >= 50000 && val <= 10000000) {
              sum_insured += val;
            }
          });
        }
      }
    }
  }
  
  // Fallback: try to find sum insured from "Details of Previous Policies" table
  if (sum_insured === 0) {
    const prevPolicyMatch = cleanText.match(/Details of Previous Policies[\s\S]*?Sum Insured[^0-9]*?(\d{1,3}(?:,?\d{3})*)/i);
    if (prevPolicyMatch) {
      sum_insured = parseFloat(prevPolicyMatch[1].replace(/,/g, ''));
    }
  }
  
  // Extract premium (final total from Payment Details) - look for last Total before Receipt
  let premium = 0;
  const paymentSection = cleanText.match(/PAYMENT DETAILS(.{0,1500})(?:Receipt Number|Receipt Date|INTERMEDIARY)/i);
  if (paymentSection) {
    // Look for Total followed by a number - get the LAST occurrence which is the final total
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
  
  // Determine policy holder type - CRITICAL: Check for floater first
  let policy_holder_type: string | null = null;
  
  // Check for Family Floater Basis (most reliable indicator)
  if (cleanText.match(/Family Floater Basis/i) || cleanText.match(/Policy Type\s*:?\s*Family Floater/i)) {
    policy_holder_type = 'Floater';
  } else {
    // Check insured persons section
    const insuredPersonsSection = cleanText.match(/DETAILS OF INSURED PERSONS(.{0,1500}?)(?:SUMMARY OF COVERAGE|Optional Cover)/i);
    if (!insuredPersonsSection) {
      // Try alternate section name for Family Medicare
      const insuredDetailsSection = cleanText.match(/Insured Details(.{0,2000}?)(?:Optional Cover|OPTIONAL COVERS)/i);
      if (insuredDetailsSection) {
        // Count family members (look for relation keywords)
        const relations = insuredDetailsSection[1].match(/\b(Self|Spouse|Son|Daughter|Father|Mother|Child)\b/gi);
        if (relations && relations.length > 1) {
          policy_holder_type = 'Family';
        } else {
          policy_holder_type = 'Individual';
        }
      }
    } else {
      // Count rows (look for relation keywords)
      const relations = insuredPersonsSection[1].match(/\b(Self|Spouse|Son|Daughter|Father|Mother|Child)\b/gi);
      if (relations) {
        policy_holder_type = relations.length > 1 ? 'Family' : 'Individual';
      }
    }
    
    // Final check: if floater is mentioned anywhere, override
    if (cleanText.match(/\bfloater\b/i)) {
      policy_holder_type = 'Floater';
    }
  }
  
  // Validate required fields
  if (!client_name || !policy_number) {
    throw new Error("Could not extract required fields: client_name and policy_number");
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
    policy_holder_type,
  };
}

/**
 * Quick validation check for United India policies
 */
export function isUnitedIndiaPolicy(text: string): boolean {
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes("united india insurance") ||
    lowerText.includes("uiic.co.in") ||
    lowerText.includes("irdai reg") && lowerText.includes("545")
  );
}
