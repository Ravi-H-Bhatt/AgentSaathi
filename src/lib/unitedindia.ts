/**
 * United India Insurance Company Limited parser
 * Extracts policy details from United India health insurance policy PDFs
 */

import Groq from "groq-sdk";

// Lazy-init Groq client to ensure env is loaded
let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqClient;
}

export interface UnitedIndiaExtraction {
  client_name: string;
  policy_number: string;
  previous_policy_number?: string | null; // For matching existing policies
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

export async function extractUnitedIndia(
  pdfBase64: string
): Promise<UnitedIndiaExtraction> {
  const response = await getGroqClient().chat.completions.create({
    model: "llama-3.2-90b-vision-preview",
    temperature: 0,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${pdfBase64}`,
            },
          },
          {
            type: "text",
            text: `You are extracting data from a United India Insurance policy document. Read the document carefully and extract the following fields EXACTLY as they appear.

EXTRACTION INSTRUCTIONS (Follow precisely):

1. **client_name**: Look for "Policyholder Name" in "POLICY DETAILS" section
   - Example: "MR MR.JIGNESH RAJENDRAKUMAR SHAH."
   - Clean up: Remove "MR MR." prefix, keep just "JIGNESH RAJENDRAKUMAR SHAH"
   
2. **policy_number**: Look for "Policy No." under "POLICY DETAILS"
   - Example: "0605002825P116693180"
   - This is the CURRENT policy number

3. **previous_policy_number**: Look for "Previous Policy No." under "POLICY DETAILS"
   - Example: "0605002824P117164550"
   - If not found, set to null

4. **company**: Always set to "United India Insurance"

5. **product_name**: Look for plan name in "SUMMARY OF COVERAGE" section
   - Example: "Individual Health Insurance - Platinum"
   - Or look at document header: "INDIVIDUAL HEALTH INSURANCE POLICY"

6. **policy_type**: Determine from document title
   - Example: "Health Insurance" or "Mediclaim"

7. **sum_insured**: Look in "SUMMARY OF COVERAGE" section
   - Find "Sum Insured" column for ALL insured persons
   - ADD all individual sum insured values together
   - Example: If 4 members have 200000, 200000, 150000, 150000 → Total = 700000

8. **premium**: Look in "PAYMENT DETAILS" section
   - Find the FINAL "Total" amount (after all discounts and charges)
   - Example: Look for line showing "Total" followed by amount like "19,346.00"
   - Return as number without commas: 19346

9. **start_date**: Look for "Period of Insurance" in "POLICY DETAILS"
   - Extract the FROM date
   - Example: "From 00:00 hrs of 01/02/2026" → "01/02/2026"
   - Format: DD/MM/YYYY

10. **renewal_date**: Look for "Period of Insurance" in "POLICY DETAILS"
    - Extract the TO date
    - Example: "To Midnight on 31/01/2027" → "31/01/2027"
    - Format: DD/MM/YYYY

11. **client_address**: Look for "Address" under "YOUR CONTACT INFORMATION"
    - Extract complete address including city, state, PIN
    - Example: "7, MIRAL APPARTMENTS, NEAR JAIN UPASHRAY, BHAGWAN NAGAR TEKRO, PALDI, AHMADABAD GUJARAT-380007"

12. **policy_holder_type**: Determine from number of insured persons in "DETAILS OF INSURED PERSONS"
    - If 1 person: "Individual"
    - If 2+ persons: "Family"
    - If explicitly mentions "Floater": "Floater"

CRITICAL RULES:
- Return ONLY valid JSON
- All numeric values must be numbers (not strings)
- All dates must be in DD/MM/YYYY format
- If a field is not found, use null (not empty string)
- Clean up client_name: remove duplicate titles like "MR MR.", "MRS MRS."

Return this EXACT JSON structure:
{
  "client_name": "JIGNESH RAJENDRAKUMAR SHAH",
  "policy_number": "0605002825P116693180",
  "previous_policy_number": "0605002824P117164550",
  "company": "United India Insurance",
  "product_name": "Individual Health Insurance - Platinum",
  "policy_type": "Health Insurance",
  "sum_insured": 700000,
  "premium": 19346,
  "start_date": "01/02/2026",
  "renewal_date": "31/01/2027",
  "client_address": "7, MIRAL APPARTMENTS, NEAR JAIN UPASHRAY, BHAGWAN NAGAR TEKRO, PALDI, AHMADABAD GUJARAT-380007",
  "policy_holder_type": "Family"
}`,
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from Groq");
  }

  // Parse JSON response
  let data: any;
  try {
    data = JSON.parse(content);
  } catch (err) {
    console.error('[United India] Failed to parse JSON response:', content);
    throw new Error("Invalid JSON response from AI");
  }

  // Clean up client_name - remove duplicate titles
  if (data.client_name) {
    data.client_name = data.client_name
      .replace(/^(MR|MRS|MS|DR)\.?\s+(MR|MRS|MS|DR)\.?\s+/i, '')
      .replace(/^(MR|MRS|MS|DR)\.?\s+/i, '')
      .trim();
  }

  // Ensure company is always correct
  data.company = "United India Insurance";

  // Validate required fields
  if (!data.client_name || !data.policy_number) {
    throw new Error("Missing required fields: client_name and policy_number are mandatory");
  }

  // Ensure sum_insured and premium are numbers
  if (data.sum_insured) {
    data.sum_insured = typeof data.sum_insured === 'string' 
      ? parseFloat(data.sum_insured.replace(/,/g, ''))
      : data.sum_insured;
  }
  if (data.premium) {
    data.premium = typeof data.premium === 'string'
      ? parseFloat(data.premium.replace(/,/g, ''))
      : data.premium;
  }

  return data as UnitedIndiaExtraction;
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
