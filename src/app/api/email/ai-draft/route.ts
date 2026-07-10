import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { getClients, getPolicies } from "@/lib/data";
import { ownerIdFor, permissionsFor } from "@/lib/team";
import { draftEmailWithAi } from "@/lib/groq";
import type { Client, Policy } from "@/lib/types";

export const runtime = "nodejs";

function fmtMoney(n: number | null) {
  return n == null ? "—" : "₹" + n.toLocaleString("en-IN");
}

/** Build context from agent's clients/policies for AI email drafting.
 *  Filtered to the question + size-capped to stay under the model TPM limit. */
function buildContext(clients: Client[], policies: Policy[], question: string): string {
  const byClient = new Map<string, Policy[]>();
  for (const p of policies) {
    const arr = byClient.get(p.client_id) || [];
    arr.push(p);
    byClient.set(p.client_id, arr);
  }

  const qWords = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  // Ignore generic words so they don't match client names by accident.
  const STOP = new Set([
    "the", "and", "for", "draft", "write", "email", "mail", "renewal",
    "reminder", "letter", "send", "please", "client", "policy", "note",
    "message", "birthday", "wish", "thank", "you", "follow", "up",
  ]);
  const nameWords = qWords.filter((w) => !STOP.has(w));

  const scored = clients.map((c) => {
    const name = (c.full_name || "").toLowerCase();
    const score = nameWords.reduce((s, w) => (name.includes(w) ? s + 1 : s), 0);
    return { client: c, score };
  });
  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.client);

  // No specific client named → don't dump the whole book (avoids hitting the
  // model's tokens-per-minute cap). A generic template needs no client data.
  if (matched.length === 0) {
    return `SUMMARY: The agent has ${clients.length} clients on record. No specific client was named — draft a generic template (greet 'Dear Valued Client' and leave 'to' empty).`;
  }

  const selected = matched.slice(0, 15);

  const MAX_CHARS = 10000;
  const lines: string[] = [];
  let size = 0;
  for (const c of selected) {
    const head = `CLIENT: ${c.full_name}${c.email ? ` | email: ${c.email}` : ""}${
      c.phone ? ` | phone: ${c.phone}` : ""
    }${c.age != null ? ` | age: ${c.age}` : ""}`;
    if (size + head.length > MAX_CHARS) break;
    lines.push(head);
    size += head.length;

    const ps = byClient.get(c.id) || [];
    if (ps.length === 0) lines.push("  (no policies on record)");
    for (const p of ps) {
      const line = `  POLICY: company=${p.company || "—"}, type=${
        p.policy_type || "—"
      }, number=${p.policy_number || "—"}, sum_insured=${fmtMoney(
        p.sum_insured
      )}, premium=${fmtMoney(p.premium)}, renewal=${p.renewal_date || "—"}`;
      if (size + line.length > MAX_CHARS) break;
      lines.push(line);
      size += line.length;
    }
    if (size >= MAX_CHARS) break;
  }
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).ai) {
    return NextResponse.json(
      { error: "You don't have access to the AI assistant." },
      { status: 403 }
    );
  }

  const { question, history } = await request.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const ownerId = ownerIdFor(agent);

  // Load ALL of the agent's data (paginated past the 1000-row cap).
  const [clients, policies] = await Promise.all([
    getClients(ownerId),
    getPolicies(ownerId),
  ]);

  const context = buildContext(clients, policies, question);

  try {
    const result = await draftEmailWithAi(
      question,
      context,
      history || [],
      agent.full_name || agent.email
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai-draft] Error:", err);
    return NextResponse.json(
      {
        answer:
          "I'm having trouble drafting that email right now. Please try again.",
      },
      { status: 200 }
    );
  }
}
