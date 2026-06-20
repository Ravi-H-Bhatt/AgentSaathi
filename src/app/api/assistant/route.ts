import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { answerGrounded } from "@/lib/groq";
import { webSearchConfigured } from "@/lib/websearch";
import type { Client, Policy } from "@/lib/types";

export const runtime = "nodejs";

function fmtMoney(n: number | null) {
  return n == null ? "—" : "₹" + n.toLocaleString("en-IN");
}

/** Build a compact context string from the agent's own clients/policies.
 *  Filters to clients relevant to the question and hard-caps total size so we
 *  never exceed the model's tokens-per-minute limit (≈12k TPM on free tier). */
function buildContext(clients: Client[], policies: Policy[], question: string): string {
  const byClient = new Map<string, Policy[]>();
  for (const p of policies) {
    const arr = byClient.get(p.client_id) || [];
    arr.push(p);
    byClient.set(p.client_id, arr);
  }

  // Tokens in the question → match against client names so "policies for Rahul"
  // only pulls Rahul's record instead of the entire book.
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
  // If the question names specific clients, use those; otherwise a capped sample.
  const selected = matched.length > 0 ? matched : clients.slice(0, 40);

  const MAX_CHARS = 12000; // keep CONTEXT well under the TPM budget
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

  const total = clients.length;
  if (selected.length < total && matched.length === 0) {
    lines.push(
      `\n(Note: showing ${selected.length} of ${total} clients. Ask about a client by name for their exact details.)`
    );
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

  // Ensure session is valid (RLS would also enforce ownership).
  await createClient();
  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);

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

  // Record the search for the colleagues activity feed (best-effort).
  await logActivity(agent, "ai_search", question.slice(0, 140));

  try {
    const answer = await answerGrounded(question, context, history || [], {
      webEnabled: webSearchConfigured(),
    });

    // Only replace genuinely empty answers. Do NOT keyword-filter — words like
    // "error" or "function" appear in valid finance/insurance answers.
    const sanitized =
      answer && answer.trim().length > 0
        ? answer
        : "I'm having trouble answering that right now. Please try again.";

    return NextResponse.json({ answer: sanitized });
  } catch (err) {
    console.error("[assistant] Error:", err);
    return NextResponse.json(
      { answer: "I'm temporarily unavailable. Please try again in a moment." },
      { status: 200 } // Return 200 so client shows friendly message
    );
  }
}
