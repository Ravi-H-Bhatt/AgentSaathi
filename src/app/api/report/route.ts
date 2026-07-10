import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor } from "@/lib/team";

export const runtime = "nodejs";

/** POST /api/report — an agent or colleague reports an error/issue. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, page } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Please describe the issue." }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("error_reports").insert({
    reporter_id: agent.id,
    reporter_name: agent.full_name || agent.email,
    reporter_email: agent.email,
    owner_id: ownerIdFor(agent),
    message: message.trim().slice(0, 2000),
    page: page?.toString().slice(0, 200) || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Send push notification to admin
  try {
    const { data: admins } = await db
      .from("agents")
      .select("id")
      .eq("role", "admin")
      .eq("status", "approved");
    
    if (admins && admins.length > 0) {
      const { data: subscriptions } = await db
        .from("push_subscriptions")
        .select("*")
        .in("agent_id", admins.map(a => a.id));
      
      if (subscriptions && subscriptions.length > 0) {
        const webpush = await import("web-push");
        
        // Configure web-push
        webpush.setVapidDetails(
          "mailto:admin@agentsaathi.com",
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!
        );
        
        const payload = JSON.stringify({
          title: "New Error Report",
          body: `${agent.full_name || agent.email}: ${message.slice(0, 100)}`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "error-report",
          data: { url: "/admin/reports" },
        });
        
        // Send to all admin subscriptions
        await Promise.all(
          subscriptions.map((sub) =>
            webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload
            ).catch((err) => {
              console.error("[report] Push notification failed:", err);
              // Delete invalid subscription
              if (err.statusCode === 410) {
                db.from("push_subscriptions").delete().eq("id", sub.id);
              }
            })
          )
        );
      }
    }
  } catch (err) {
    console.error("[report] Failed to send admin notification:", err);
    // Don't fail the request if notification fails
  }
  
  return NextResponse.json({ ok: true });
}
