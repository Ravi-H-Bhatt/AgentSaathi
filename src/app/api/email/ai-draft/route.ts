import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
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

  const scored = clients.map((c) => {
    const name = (c.full_name || "").toLowerCase();
    const score = qWords.reduce((s, w) => (name.includes(w) ? s + 1 : s), 0);
    return { client: c, score };
  });
  const matched = scored.filter((s) => s.score > 0).map((s) => s.client);
  const selected = matched.length > 0 ? matched : clients.slice(0, 30);

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

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);

  // Load agent's data
  const { data: clients } = await db
    .from("clients")
    .select("*")
    .eq("agent_id", ownerId);
  const { data: policies } = await db
    .from("policies")
    .select("*")
    .eq("agent_id", ownerId);

  const context = buildContext(
    (clients as Client[]) || [],
    (policies as Policy[]) || [],
    question
  );

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
