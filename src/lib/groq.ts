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
/**
 * Answer an agent's question. The assistant is grounded in the agent's own
 * CONTEXT (clients/policies) and can call tools:
 *  - calculator: deterministic math
 *  - web_search: look things up online (e.g. "suggest 10 best policies")
 * Client-specific facts must come from CONTEXT; the web is for general info.
 */
export async function answerGrounded(
  question: string,
  context: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  opts: { webEnabled?: boolean } = {}
): Promise<string> {
  const { calculate } = await import("@/lib/calc");
  const webEnabled = opts.webEnabled ?? false;

  const system = [
    "You are AgentSaathi's assistant for an insurance agent based in Gujarat, India.",
    "You help with insurance, mutual funds, and personal finance — all in the INDIAN context (currency is INR ₹, Indian companies, Indian regulations like IRDAI and SEBI).",
    "",
    "INDIA-FIRST RULE (very important):",
    "- NEVER reference foreign/US companies like GEICO, State Farm, Allstate, USAA. They do not operate in India and are irrelevant.",
    "- Life insurance leaders in India: LIC, HDFC Life, SBI Life, ICICI Prudential Life, Max Life, Bajaj Allianz Life, Tata AIA, Kotak Life.",
    "- Health insurance leaders: Star Health, Niva Bupa, HDFC ERGO, ICICI Lombard, Care Health, Tata AIG, New India Assurance.",
    "- General/motor insurance: New India Assurance, ICICI Lombard, Bajaj Allianz, HDFC ERGO, Tata AIG.",
    "- Mutual fund AMCs: SBI MF, HDFC MF, ICICI Prudential MF, Nippon India MF, Axis MF, Kotak MF, UTI MF.",
    "- Always quote money in Indian Rupees (₹) using the Indian numbering system (lakh/crore) where natural.",
    "",
    "GROUNDING RULES:",
    "- For questions about THIS agent's OWN clients/policies, use ONLY the CONTEXT below. If a detail isn't there, say you have no record of it. Never invent client data.",
    "- If the agent asks about a client by name and MULTIPLE clients in CONTEXT match (same or similar name), list ALL of them separately with their distinguishing details (email/phone) and each one's policies, so the agent can tell them apart. Do not merge them.",
    "- For GENERAL questions (best policies, company comparisons, mutual fund/finance info, market data, definitions): " +
      (webEnabled
        ? "ALWAYS call the web_search tool first to get current, accurate information, then summarize and cite source links."
        : "answer from your India-specific general knowledge with a clear caveat that live web search is not enabled."),
    "- For any arithmetic, premium math, totals, or projections, use the calculator tool rather than computing in your head.",
    "- When you suggest products, make clear they are general suggestions to research, not personalized financial advice, and cite source links when available.",
    "",
    "EMAIL DRAFTING:",
    "- When the agent asks you to draft/write an email to a client (e.g. renewal reminder, follow-up), first identify the client in CONTEXT.",
    "- If the client has MORE THAN ONE policy and the agent didn't specify which, ASK which policy the email is about (list the options by type + company + policy number) before drafting. Do not guess.",
    "- If the client (or the chosen policy) is not in CONTEXT, say you have no record and ask for the details rather than inventing them.",
    "- Once the policy is clear, draft a complete, professional email using the REAL details from CONTEXT (client name, company, policy type, policy number, sum insured, premium, renewal date). Use ₹ for money.",
    "- Format the draft so it is easy to copy-paste: output a 'Subject:' line, then the body. Keep it concise, courteous, and signed off with the agent's name. Do NOT include placeholders like [name] when the real value is known.",
    "Be concise and professional. When listing policies from CONTEXT, include company, type, policy number, sum insured, premium, and renewal date when available.",
    webEnabled
      ? "Web search IS available — use it for any general/market question."
      : "Web search is NOT configured. For live-web questions, say it's not enabled and answer from general India-specific knowledge with a caveat.",
    "",
    "CONTEXT (the agent's own data):",
    context || "(no data available)",
  ].join("\n");

  const tools = buildTools(webEnabled);

  type ChatMsg = {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_calls?: {
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }[];
    tool_call_id?: string;
  };

  const messages: ChatMsg[] = [
    { role: "system", content: system },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: question },
  ];

  // Tool-calling loop (bounded to avoid runaway calls).
  for (let step = 0; step < 4; step++) {
    const completion = await groqClient().chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      tool_choice: "auto",
    });

    const msg = completion.choices[0]?.message;
    if (!msg) break;

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return msg.content || "I couldn't generate a response. Please try again.";
    }

    // Record the assistant's tool-call turn.
    messages.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    });

    for (const tc of toolCalls) {
      const result = await runTool(tc.function.name, tc.function.arguments, {
        calculate,
        webEnabled,
      });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
  }

  // Fallback: ask for a final answer without tools.
  const final = await groqClient().chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
  });
  return (
    final.choices[0]?.message?.content ||
    "I couldn't generate a response. Please try again."
  );
}

function buildTools(webEnabled: boolean) {
  const tools: unknown[] = [
    {
      type: "function",
      function: {
        name: "calculator",
        description:
          "Evaluate a mathematical expression. Supports + - * / % ^, parentheses, and functions sqrt, abs, round, floor, ceil, pow, min, max, log, ln, log10, exp.",
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: "The math expression, e.g. '15000 * 1.18' or 'sqrt(144)'.",
            },
          },
          required: ["expression"],
        },
      },
    },
  ];
  if (webEnabled) {
    tools.push({
      type: "function",
      function: {
        name: "web_search",
        description:
          "Search the web for current, general information such as available insurance products, mutual funds, plan comparisons, or market data. ALWAYS scope queries to India (e.g. add 'India' or 'in India 2026') since the user is an Indian insurance agent in Gujarat. Returns titles, URLs, and snippets to cite.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The search query. Include 'India' for product/company/finance questions, e.g. 'best term life insurance plans in India 2026'.",
            },
          },
          required: ["query"],
        },
      },
    });
  }
  return tools;
}

async function runTool(
  name: string,
  argsJson: string,
  deps: {
    calculate: (e: string) => { result: number };
    webEnabled: boolean;
  }
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}");
  } catch {
    return "Invalid tool arguments.";
  }

  if (name === "calculator") {
    try {
      const { result } = deps.calculate(String(args.expression || ""));
      return JSON.stringify({ result });
    } catch (e) {
      return JSON.stringify({
        error: e instanceof Error ? e.message : "calculation error",
      });
    }
  }

  if (name === "web_search") {
    if (!deps.webEnabled) {
      return JSON.stringify({ error: "Web search is not configured." });
    }
    try {
      const { webSearch } = await import("@/lib/websearch");
      const { answer, results } = await webSearch(String(args.query || ""));
      return JSON.stringify({
        answer,
        results: results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content.slice(0, 400),
        })),
      });
    } catch (e) {
      return JSON.stringify({
        error: e instanceof Error ? e.message : "search error",
      });
    }
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}
