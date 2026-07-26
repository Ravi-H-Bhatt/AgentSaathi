/**
 * United India Insurance - Document Type Detector & Router
 * 
 * Detects what type of United India document this is and routes to appropriate parser:
 * 1. Family Floater Policy (single policy document) - Page 2 structure
 * 2. Premium Register (bulk) - Multiple policies in table format
 * 3. Individual Health Policy - Single policy document
 */

export type UnitedIndiaDocumentType = 
  | 'family-floater-policy'      // Single family policy with previous policy number
  | 'individual-policy'           // Single individual policy
  | 'premium-register'            // Bulk register with multiple policies
  | 'unknown';

export interface DetectionResult {
  type: UnitedIndiaDocumentType;
  confidence: number; // 0-1
  isRegister: boolean;
  policyCount: number;
  details: {
    hasPolicyDetails: boolean;
    hasPreviousPolicyField: boolean;
    hasFamilyFloaterBasis: boolean;
    hasFamilyMembers: boolean;
    policyNumbersFound: string[];
  };
}

/**
 * Detect United India document type
 */
export function detectUnitedIndiaDocumentType(text: string): DetectionResult {
  const lower = text.toLowerCase();
  const policyNumbers = text.match(/\b0605002[0-9]{3}[A-Z]\d{8}\b/g) || [];
  const uniquePolicies = [...new Set(policyNumbers)];

  const details = {
    // Match both "POLICY NO. : XXX" and "Policy Number XXX" (with or without colon)
    hasPolicyDetails: /POLICY\s+(?:DETAILS|NO\.?|Number)\s*:?\s*\d{10}[A-Z]\d{8}|Policy\s+Number\s+\d{10}[A-Z]\d{8}/i.test(text),
    // Match both "Previous Policy No. : XXX" and "Previous Policy No. XXX" (with or without colon)
    hasPreviousPolicyField: /Previous\s+Policy\s+No\.?\s*:?\s*\d{10}[A-Z]\d{8}/i.test(text),
    // Enhanced pattern to catch more floater variations:
    // - "FAMILY MEDICARE POLICY" (JHA PDF)
    // - "Family Floater Basis/SI"
    // - "Policy Type Family Floater"
    // - Generic "floater" mention with "family" nearby
    hasFamilyFloaterBasis: /FAMILY\s+MEDICARE\s+POLICY|Family\s+Floater\s+(?:Basis|SI|Policy)|Policy\s+Type\s*:?\s*Family\s+Floater|(?:family|group).*floater|floater.*(?:family|group)/i.test(text),
    // Enhanced pattern to catch insured persons section:
    hasFamilyMembers: /DETAILS?\s+OF\s+(?:THE\s+)?INSURED\s+(?:PERSONS?|MEMBERS?)|INSURED\s+DETAILS?|Insured\s+Persons?\s+Details?|Insured\s+Details/i.test(text),
    policyNumbersFound: uniquePolicies,
  };

  // === PREMIUM REGISTER ===
  // Multiple policies in table format
  if (lower.includes('premium register') && uniquePolicies.length >= 10) {
    return {
      type: 'premium-register',
      confidence: 1.0,
      isRegister: true,
      policyCount: uniquePolicies.length,
      details,
    };
  }

  // === FAMILY FLOATER POLICY ===
  // Single policy with family members and previous policy number
  // Note: History table (page 5) may list multiple old policy numbers
  if (
    details.hasPolicyDetails &&
    details.hasPreviousPolicyField &&
    (details.hasFamilyFloaterBasis || details.hasFamilyMembers)
  ) {
    return {
      type: 'family-floater-policy',
      confidence: 0.95,
      isRegister: false,
      policyCount: 1,
      details,
    };
  }

  // === INDIVIDUAL POLICY ===
  // Single policy document (no family members, no previous policy)
  if (
    details.hasPolicyDetails &&
    !details.hasFamilyMembers &&
    uniquePolicies.length === 1
  ) {
    return {
      type: 'individual-policy',
      confidence: 0.9,
      isRegister: false,
      policyCount: 1,
      details,
    };
  }

  // === FALLBACK ===
  return {
    type: 'unknown',
    confidence: 0,
    isRegister: uniquePolicies.length >= 10,
    policyCount: uniquePolicies.length,
    details,
  };
}

/**
 * Extract policy number from text (handles multiple formats)
 */
export function extractCurrentPolicyNumber(text: string): string | null {
  // Try to find from POLICY DETAILS section first (page 2)
  // Pattern 1: "Policy Number XXXXXXXXXXX" (without colon - JHA format)
  let detailsMatch = text.match(
    /Policy\s+Number\s+([0-9]{10}[A-Z][0-9]{8})/i
  );
  
  // Pattern 2: "POLICY NO. : XXXXXXXXXXX" (with colon)
  if (!detailsMatch) {
    detailsMatch = text.match(
      /POLICY\s+(?:DETAILS|NO\.)\s*:?\s*([0-9]{10}[A-Z][0-9]{8})/i
    );
  }
  
  if (detailsMatch) {
    return detailsMatch[1];
  }

  // Fallback: just find any policy number
  const anyMatch = text.match(/\b(0605002[0-9]{3}[A-Z]\d{8})\b/);
  return anyMatch ? anyMatch[1] : null;
}

/**
 * Extract previous policy number for renewals
 */
export function extractPreviousPolicyNumber(text: string): string | null {
  // Pattern 1: "Previous Policy No. XXXXXXXXXXX" (without colon - JHA format)
  let match = text.match(
    /Previous\s+Policy\s+No\.\s+([0-9]{10}[A-Z][0-9]{8})/i
  );
  
  // Pattern 2: "Previous Policy No. : XXXXXXXXXXX" (with colon)
  if (!match) {
    match = text.match(
      /Previous\s+Policy\s+No\.\s*:?\s*([0-9]{10}[A-Z][0-9]{8})/i
    );
  }
  
  return match ? match[1] : null;
}

/**
 * Get recommended parser for detected document type
 */
export function getRecommendedParser(
  detectionResult: DetectionResult
): 'unitedindia-floater' | 'unitedindia-register' | 'unitedindia-standard' | null {
  if (!detectionResult.type || detectionResult.type === 'unknown') {
    return null;
  }

  if (detectionResult.type === 'family-floater-policy') {
    return 'unitedindia-floater';
  }

  if (detectionResult.type === 'premium-register') {
    return 'unitedindia-register';
  }

  return 'unitedindia-standard';
}

/**
 * Format detection result for logging
 */
export function formatDetectionResult(result: DetectionResult): string {
  return `
Document Type: ${result.type}
Confidence: ${(result.confidence * 100).toFixed(0)}%
Is Register: ${result.isRegister}
Policy Count: ${result.policyCount}
Has POLICY DETAILS section: ${result.details.hasPolicyDetails}
Has Previous Policy field: ${result.details.hasPreviousPolicyField}
Has Family Floater basis: ${result.details.hasFamilyFloaterBasis}
Has Family Members: ${result.details.hasFamilyMembers}
Policy Numbers: ${result.details.policyNumbersFound.length > 0 ? result.details.policyNumbersFound.join(', ') : 'None'}
`.trim();
}
