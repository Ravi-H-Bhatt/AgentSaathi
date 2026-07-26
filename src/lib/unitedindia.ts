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
  
  // Extract product name
  let product_name = 'Individual Health Insurance';
  if (cleanText.match(/INDIVIDUAL HEALTH INSURANCE POLICY/i)) {
    const planMatch = cleanText.match(/(Platinum|Gold|Silver)\s*\d{6}/i);
    if (planMatch) {
      product_name = `Individual Health Insurance - ${planMatch[1]}`;
    }
  }
  
  // Extract dates (Period of Insurance)
  const periodMatch = cleanText.match(/Period of Insurance\s*:?\s*From[^0-9]*(\d{2}\/\d{2}\/\d{4})[^T]*To[^0-9]*(\d{2}\/\d{2}\/\d{4})/i);
  const start_date = periodMatch?.[1] || '';
  const renewal_date = periodMatch?.[2] || '';
  
  // Extract address
  let client_address = null;
  const addressMatch = cleanText.match(/Address\s*:?\s*([^T]+?)(?:\s+Tel \(O\/R\)|Mobile|$)/i);
  if (addressMatch) {
    client_address = addressMatch[1].trim().replace(/\s+/g, ' ');
  }
  
  // Extract sum insured (sum all members)
  let sum_insured = 0;
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
  
  // Fallback: try to find sum insured from "Details of Previous Policies" table
  if (sum_insured === 0) {
    const prevPolicyMatch = cleanText.match(/Details of Previous Policies[\s\S]*?Sum Insured[^0-9]*?(\d{1,3}(?:,?\d{3})*)/i);
    if (prevPolicyMatch) {
      sum_insured = parseFloat(prevPolicyMatch[1].replace(/,/g, ''));
    }
  }
  
  // Extract premium (final total from Payment Details)
  let premium = 0;
  const paymentSection = cleanText.match(/PAYMENT DETAILS(.{0,1000})(?:INTERMEDIARY|Receipt Number)/i);
  if (paymentSection) {
    // Look for the last "Total" line before INTERMEDIARY
    const totalMatches = paymentSection[1].match(/Total\s*:?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi);
    if (totalMatches && totalMatches.length > 0) {
      const lastTotal = totalMatches[totalMatches.length - 1];
      const amountMatch = lastTotal.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
      if (amountMatch) {
        premium = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
  }
  
  // Determine policy holder type
  let policy_holder_type: string | null = null;
  const insuredPersonsSection = cleanText.match(/DETAILS OF INSURED PERSONS(.{0,1500}?)SUMMARY OF COVERAGE/i);
  if (insuredPersonsSection) {
    // Count rows (look for relation keywords)
    const relations = insuredPersonsSection[1].match(/\b(Self|Spouse|Son|Daughter|Father|Mother)\b/gi);
    if (relations) {
      policy_holder_type = relations.length > 1 ? 'Family' : 'Individual';
    }
    // Check if floater is mentioned
    if (cleanText.match(/floater/i)) {
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
