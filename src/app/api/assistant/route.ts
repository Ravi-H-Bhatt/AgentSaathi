import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { answerGrounded } from "@/lib/groq";
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

  const { question, history } = await request.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  // Ensure session is valid (RLS would also enforce ownership).
  await createClient();
  const db = createAdminClient();

  const { data: clients } = await db
    .from("clients")
    .select("*")
    .eq("agent_id", agent.id);
  const { data: policies } = await db
    .from("policies")
    .select("*")
    .eq("agent_id", agent.id);

  const context = buildContext(
    (clients as Client[]) || [],
    (policies as Policy[]) || []
  );

  try {
    const answer = await answerGrounded(question, context, history || []);
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json(
      { error: "Assistant error", answer: "The assistant is unavailable right now. Please try again." },
      { status: 500 }
    );
  }
}
