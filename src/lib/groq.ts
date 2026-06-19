import "server-only";

import Groq from "groq-sdk";
import type { ExtractedPolicy } from "@/lib/types";

let _groq: Groq | null = null;
function groqClient(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Parse raw policy-document text into structured fields using Groq.
 * The model is instructed to return null (not guesses) for missing fields
 * and to list low-confidence fields so the agent can review them.
 */
export async function extractPolicyFromText(
  text: string
): Promise<ExtractedPolicy> {
  const trimmed = text.slice(0, 16000); // keep within token budget

  const system = [
    "You extract structured insurance-policy data from raw document text.",
    "Return ONLY valid JSON matching the requested schema.",
    "Rules:",
    "- If a value is not clearly present, use null. NEVER invent or guess values.",
    "- Dates must be ISO format YYYY-MM-DD. If only a year/month is present, do your best; otherwise null.",
    "- sum_insured and premium must be plain numbers (no currency symbols, commas, or text).",
    "- age must be an integer if present, else null.",
    "- list any field you are unsure about in low_confidence_fields.",
  ].join("\n");

  const user = `Extract policy data from this document text:\n\n"""${trimmed}"""\n\nReturn JSON with exactly these keys: client_name, client_email, client_phone, date_of_birth, age, company, policy_type, policy_number, sum_insured, premium, start_date, renewal_date, low_confidence_fields (array of strings).`;

  const completion = await groqClient().chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed: Partial<ExtractedPolicy> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    client_name: parsed.client_name ?? null,
    client_email: parsed.client_email ?? null,
    client_phone: parsed.client_phone ?? null,
    date_of_birth: parsed.date_of_birth ?? null,
    age: typeof parsed.age === "number" ? parsed.age : null,
    company: parsed.company ?? null,
    policy_type: parsed.policy_type ?? null,
    policy_number: parsed.policy_number ?? null,
    sum_insured: typeof parsed.sum_insured === "number" ? parsed.sum_insured : null,
    premium: typeof parsed.premium === "number" ? parsed.premium : null,
    start_date: parsed.start_date ?? null,
    renewal_date: parsed.renewal_date ?? null,
    low_confidence_fields: Array.isArray(parsed.low_confidence_fields)
      ? parsed.low_confidence_fields
      : [],
  };
}

/**
 * Answer an agent's question grounded ONLY in the provided context (their own
 * client/policy data). If the answer isn't in the context, the model says so.
 */
export async function answerGrounded(
  question: string,
  context: string,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<string> {
  const system = [
    "You are AgentSaathi's assistant for an insurance agent.",
    "Answer ONLY using the CONTEXT provided below, which contains the agent's own clients and policies.",
    "If the answer is not in the context, say you have no record of it. Do NOT use outside knowledge or invent details.",
    "Be concise and professional. When listing policies, include company, type, policy number, sum insured, premium, and renewal date when available.",
    "",
    "CONTEXT:",
    context || "(no data available)",
  ].join("\n");

  const completion = await groqClient().chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      ...history.slice(-6),
      { role: "user", content: question },
    ],
  });

  return (
    completion.choices[0]?.message?.content ||
    "I couldn't generate a response. Please try again."
  );
}
