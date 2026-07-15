"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/** Convert a base64url VAPID key to the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "off" | "on" | "loading" | "enabling";

/**
 * Auto-enable notifications on first load. Users can disable if they want.
 */
export function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !VAPID_PUBLIC_KEY
      ) {
        console.log("[Notifications] Browser does not support push notifications");
        if (!cancelled) setState("unsupported");
        return;
      }
      
      // Check current permission status
      const currentPermission = Notification.permission;
      console.log("[Notifications] Current permission:", currentPermission);
      
      try {
        const reg = await navigator.serviceWorker.ready;
        console.log("[Notifications] Service worker ready:", reg);
        const sub = await reg.pushManager.getSubscription();
        console.log("[Notifications] Current subscription:", sub);
        
        if (sub) {
          // Already subscribed
          console.log("[Notifications] Already subscribed");
          if (!cancelled) setState("on");
        } else {
          // Not subscribed - just show the button, don't auto-enable
          console.log("[Notifications] Not subscribed yet");
          if (!cancelled) setState("off");
        }
      } catch (e) {
        console.error("[Notifications] Setup error:", e);
        if (!cancelled) {
          setState("off");
          setError(e instanceof Error ? e.message : "Setup failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    console.log("[Notifications] Enable button clicked");
    setError(null);
    setState("loading");
    try {
      console.log("[Notifications] Requesting permission...");
      const permission = await Notification.requestPermission();
      console.log("[Notifications] Permission result:", permission);
      
      if (permission !== "granted") {
        setError("Notifications were blocked. Enable them in browser settings.");
        setState("off");
        return;
      }
      
      console.log("[Notifications] Waiting for service worker...");
      const reg = await navigator.serviceWorker.ready;
      console.log("[Notifications] Service worker ready, subscribing...");
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log("[Notifications] Subscribed:", sub);
      
      const subJSON = sub.toJSON();
      console.log("[Notifications] Subscription JSON:", subJSON);
      
      console.log("[Notifications] Saving to server...");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subJSON),
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error("[Notifications] Server error:", errText);
        throw new Error("Failed to save subscription: " + errText);
      }
      
      console.log("[Notifications] Subscription saved successfully");
      setState("on");
      
      // Fire a confirmation push so the user sees it works immediately.
      console.log("[Notifications] Sending test notification...");
      fetch("/api/push/test", { method: "POST" })
        .then(() => console.log("[Notifications] Test notification sent"))
        .catch((err) => console.error("[Notifications] Test notification failed:", err));
    } catch (e) {
      console.error("[Notifications] Enable error:", e);
      setError(e instanceof Error ? e.message : "Could not enable notifications");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported") return null;

  const isIOSSafari = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <>
      <button
        onClick={state === "on" ? disable : enable}
        disabled={state === "loading" || state === "enabling"}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-black/[.04] hover:text-foreground transition disabled:opacity-50"
      >
        {state === "loading" || state === "enabling" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : state === "on" ? (
          <BellOff size={16} />
        ) : (
          <Bell size={16} />
        )}
        {state === "on" ? "Disable notifications" : "Enable notifications"}
      </button>
      {error && (
        <p className="text-xs text-red-600 px-3 py-1">{error}</p>
      )}
      {isIOSSafari && state === "off" && (
        <div className="px-3 py-2 text-xs text-muted bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mt-1">
          <strong>iOS Users:</strong> Make sure you&apos;ve installed this app to your home screen (Share → Add to Home Screen) for notifications to work.
        </div>
      )}
    </>
  );
}
