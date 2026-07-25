/**
 * United India Insurance Company Limited parser
 * Extracts policy details from United India health insurance policy PDFs
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface UnitedIndiaExtraction {
  client_name: string;
  policy_number: string;
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
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: `Extract the following details from this United India Insurance policy PDF.

CRITICAL EXTRACTION RULES:
1. Client Name: Extract the policyholder name (e.g., "MR.JIGNESH RAJENDRAKUMAR SHAH")
2. Policy Number: Extract the policy number (e.g., "0605002825P116693180")
3. Company: Always set to "United India Insurance"
4. Product Name: Extract the plan name (e.g., "Individual Health Insurance - Platinum")
5. Policy Type: Extract the policy type (e.g., "Health Insurance", "Mediclaim")
6. Sum Insured: Extract TOTAL sum insured for all members (add all individual SI)
7. Premium: Extract the TOTAL annual premium amount from "Total" or "Premium" field
8. Start Date: Extract "Period of Insurance" FROM date in DD/MM/YYYY format
9. Renewal Date: Extract "Period of Insurance" TO date in DD/MM/YYYY format
10. Client Address: Extract complete address
11. Policy Holder Type: Determine from number of insured persons (Individual/Family/Floater)

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

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from response
  let jsonText = textContent.text.trim();
  
  // Remove markdown code blocks if present
  jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  
  // Parse and validate
  const data = JSON.parse(jsonText) as UnitedIndiaExtraction;

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
