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
  recipient_id: string | null;
  content: string;
  created_at: string;
}

/**
 * GET /api/chat?with=<agentId>&since=<ISO>
 * Returns the private 1:1 thread between the current user and <agentId>.
 * Without `with`, returns the team/group thread (recipient_id NULL).
 */
export async function GET(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const url = new URL(request.url);
  const withId = url.searchParams.get("with");
  const since = url.searchParams.get("since");

  let q = db
    .from("team_chat")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);

  if (withId) {
    // Private thread: messages either direction between me and them.
    q = q.or(
      `and(sender_id.eq.${agent.id},recipient_id.eq.${withId}),and(sender_id.eq.${withId},recipient_id.eq.${agent.id})`
    );
  } else {
    // Team/group thread for this owner (legacy behaviour).
    q = q.is("recipient_id", null).eq("owner_id", ownerIdFor(agent));
  }
  if (since) q = q.gt("created_at", since);

  const { data } = await q;
  return NextResponse.json({ messages: (data as ChatMessage[]) || [] });
}

/**
 * POST /api/chat  { content, recipientId? }
 * With recipientId → a private DM (push only to that person).
 * Without → a team/group message (push to the sender's team).
 */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { content, recipientId } = await request.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  const db = createAdminClient();
  const recipient = typeof recipientId === "string" && recipientId ? recipientId : null;

  // For a DM, verify the recipient exists and is approved.
  if (recipient) {
    const { data: r } = await db
      .from("agents")
      .select("id")
      .eq("id", recipient)
      .eq("status", "approved")
      .maybeSingle();
    if (!r) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }
  }

  const { data, error } = await db
    .from("team_chat")
    .insert({
      owner_id: ownerIdFor(agent),
      sender_id: agent.id,
      sender_name: agent.full_name || agent.email,
      recipient_id: recipient,
      content: content.trim(),
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(
    agent,
    recipient ? "direct_message" : "team_chat",
    content.trim().slice(0, 80)
  );

  const url = agent.role === "admin" ? "/admin" : "/dashboard";
  if (recipient) {
    // DM → notify just the recipient.
    await sendPushToAgent(recipient, {
      title: `${agent.full_name || agent.email} messaged you`,
      body: content.trim().slice(0, 120),
      url,
      tag: `dm-${agent.id}`,
    });
  } else {
    // Group → notify the sender's team (owner + colleagues) except sender.
    const ownerId = ownerIdFor(agent);
    const { data: team } = await db
      .from("agents")
      .select("id")
      .eq("status", "approved")
      .or(`id.eq.${ownerId},parent_agent_id.eq.${ownerId}`);
    const recipients =
      (team as { id: string }[])?.filter((a) => a.id !== agent.id) || [];
    for (const t of recipients) {
      await sendPushToAgent(t.id, {
        title: `${agent.full_name || agent.email} sent a message`,
        body: content.trim().slice(0, 120),
        url,
        tag: "team-chat",
      });
    }
  }

  return NextResponse.json({ message: data });
}
