import { NextResponse, type NextRequest } from "next/server";
import Groq from "groq-sdk";
import { getCurrentAgent } from "@/lib/auth";
import { extractPdfText } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let _groq: Groq | null = null;
function groqClient(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

/** Admin-only: parse a premium-chart PDF into age-band rows. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const text = (await extractPdfText(buf)).slice(0, 16000);
  if (!text || text.length < 20) {
    return NextResponse.json({
      rows: [],
      message: "Could not read text from this PDF. Add rows manually below.",
    });
  }

  const system =
    "You convert insurance premium charts into JSON rows. Return ONLY JSON: { rows: [{ policy_type, age_min, age_max, sum_insured, premium }] }. age_min/age_max are integers, premium is a number (no symbols), sum_insured number or null, policy_type a string or null. Never invent rows that aren't present.";

  try {
    const completion = await groqClient().chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Premium chart text:\n"""${text}"""` },
      ],
    });
    const parsed = JSON.parse(
      completion.choices[0]?.message?.content || '{"rows":[]}'
    );
    const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({
      rows: [],
      message: "Could not auto-parse. Add rows manually below.",
    });
  }
}
