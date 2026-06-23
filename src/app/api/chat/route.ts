import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, logActivity } from "@/lib/team";
import { sendPushToAgent } from "@/lib/push";

export const runtime = "nodejs";

export interface ChatMessage {
  id: string;
  owner_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  created_at: string;
}

/** GET /api/chat?since=<ISO> — fetch messages for the team. */
export async function GET(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const since = new URL(request.url).searchParams.get("since");

  let q = db
    .from("team_chat")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (since) q = q.gt("created_at", since);

  const { data } = await q;
  return NextResponse.json({ messages: (data as ChatMessage[]) || [] });
}

/** POST /api/chat — send a message. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { content } = await request.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const { data, error } = await db
    .from("team_chat")
    .insert({
      owner_id: ownerId,
      sender_id: agent.id,
      sender_name: agent.full_name || agent.email,
      content: content.trim(),
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await logActivity(agent, "team_chat", content.trim().slice(0, 80));
  
  // Notify all team members (owner + colleagues) EXCEPT the sender.
  const { data: team } = await db
    .from("agents")
    .select("id")
    .eq("status", "approved")
    .or(`id.eq.${ownerId},parent_agent_id.eq.${ownerId}`);
  
  const recipients = (team as { id: string }[])?.filter((a) => a.id !== agent.id) || [];
  for (const r of recipients) {
    await sendPushToAgent(r.id, {
      title: `${agent.full_name || agent.email} sent a message`,
      body: content.trim().slice(0, 120),
      url: "/dashboard",
      tag: "team-chat",
    });
  }
  
  return NextResponse.json({ message: data });
}
