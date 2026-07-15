import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

/** Lazily configure web-push with VAPID keys. Returns false if not set up. */
export function ensureWebPush(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@agentsaathi.app",
    pub,
    priv
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to every device subscribed by an agent.
 * Dead subscriptions (410/404) are pruned automatically.
 */
export async function sendPushToAgent(
  agentId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureWebPush()) {
    console.log("[push] Web push not configured");
    return { sent: 0, failed: 0 };
  }

  const db = createAdminClient();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("agent_id", agentId);

  console.log(`[push] Found ${subs?.length || 0} subscriptions for agent ${agentId}`);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        console.log(`[push] Sending to endpoint: ${s.endpoint.substring(0, 50)}...`);
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(payload)
        );
        console.log(`[push] Successfully sent notification`);
        sent++;
      } catch (err: unknown) {
        console.error(`[push] Failed to send notification:`, err);
        failed++;
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          console.log(`[push] Subscription expired (${code}), marking for removal`);
          stale.push(s.id);
        }
      }
    })
  );

  if (stale.length) {
    console.log(`[push] Removing ${stale.length} stale subscriptions`);
    await db.from("push_subscriptions").delete().in("id", stale);
  }

  console.log(`[push] Results: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
