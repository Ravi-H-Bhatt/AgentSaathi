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
            text: `Extract the following details from this United India Insurance policy PDF.

CRITICAL EXTRACTION RULES:
1. Client Name: Extract the policyholder name (e.g., "MR.JIGNESH RAJENDRAKUMAR SHAH")
2. Policy Number: Extract the CURRENT policy number (e.g., "0605002825P116693180")
3. Previous Policy Number: Extract the "Previous Policy No." if present (e.g., "0605002824P117164550")
4. Company: Always set to "United India Insurance"
5. Product Name: Extract the plan name (e.g., "Individual Health Insurance - Platinum")
6. Policy Type: Extract the policy type (e.g., "Health Insurance", "Mediclaim")
7. Sum Insured: Extract TOTAL sum insured for all members (add all individual SI)
8. Premium: Extract the TOTAL annual premium amount from "Total" or "Premium" field
9. Start Date: Extract "Period of Insurance" FROM date in DD/MM/YYYY format
10. Renewal Date: Extract "Period of Insurance" TO date in DD/MM/YYYY format
11. Client Address: Extract complete address
12. Policy Holder Type: Determine from number of insured persons (Individual/Family/Floater)

IMPORTANT FOR SUM INSURED:
- If multiple members with different SI (e.g., 200000, 200000, 150000, 150000)
- Add them ALL together for total sum_insured (e.g., 700000)
- This represents the TOTAL coverage across all family members

IMPORTANT FOR PREMIUM:
- Look for "Total" or "Total Annual Premium" or final premium amount
- This should include all member premiums, discounts, and charges
- Extract only the numeric value

Return ONLY valid JSON with this exact structure:
{
  "client_name": "string",
  "policy_number": "string",
  "previous_policy_number": "string or null",
  "company": "United India Insurance",
  "product_name": "string",
  "policy_type": "string",
  "sum_insured": number,
  "premium": number,
  "start_date": "DD/MM/YYYY",
  "renewal_date": "DD/MM/YYYY",
  "client_address": "string or null",
  "policy_holder_type": "Individual or Family or Floater or null"
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
  const data = JSON.parse(content) as UnitedIndiaExtraction;

  // Validate required fields
  if (!data.client_name || !data.policy_number || !data.company) {
    throw new Error("Missing required fields in extraction");
  }

  // Ensure company is set correctly
  data.company = "United India Insurance";

  return data;
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
