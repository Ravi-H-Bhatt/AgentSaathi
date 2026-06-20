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

/** Build a compact context string from the agent's own clients/policies. */
function buildContext(clients: Client[], policies: Policy[]): string {
  const byClient = new Map<string, Policy[]>();
  for (const p of policies) {
    const arr = byClient.get(p.client_id) || [];
    arr.push(p);
    byClient.set(p.client_id, arr);
  }
  const lines: string[] = [];
  for (const c of clients) {
    lines.push(
      `CLIENT: ${c.full_name}${c.email ? ` | email: ${c.email}` : ""}${
        c.phone ? ` | phone: ${c.phone}` : ""
      }${c.age != null ? ` | age: ${c.age}` : ""}`
    );
    const ps = byClient.get(c.id) || [];
    if (ps.length === 0) {
      lines.push("  (no policies on record)");
    }
    for (const p of ps) {
      lines.push(
        `  POLICY: company=${p.company || "—"}, type=${
          p.policy_type || "—"
        }, number=${p.policy_number || "—"}, sum_insured=${fmtMoney(
          p.sum_insured
        )}, premium=${fmtMoney(p.premium)}, renewal=${p.renewal_date || "—"}`
      );
    }
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
    (policies as Policy[]) || []
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
