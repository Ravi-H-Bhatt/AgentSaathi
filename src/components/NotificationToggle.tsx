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
        if (!cancelled) setState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        
        if (sub) {
          // Already subscribed
          if (!cancelled) setState("on");
        } else {
          // Not subscribed yet - auto-enable
          if (!cancelled) setState("enabling");
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            if (!cancelled) {
              setState("off");
              setError("Notifications blocked. Enable in browser settings.");
            }
            return;
          }
          
          const newSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          
          const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSub.toJSON()),
          });
          
          if (!res.ok) throw new Error("Failed to save subscription");
          if (!cancelled) setState("on");
        }
      } catch (e) {
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
    setError(null);
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications were blocked. Enable them in browser settings.");
        setState("off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Failed to save subscription");
      setState("on");
      // Fire a confirmation push so the user sees it works immediately.
      fetch("/api/push/test", { method: "POST" }).catch(() => {});
    } catch (e) {
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

  return (
    <>
      <button
        onClick={state === "on" ? disable : enable}
        disabled={state === "loading"}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-black/[.04] hover:text-foreground transition disabled:opacity-50"
      >
        {state === "loading" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : state === "on" ? (
          <BellOff size={16} />
        ) : (
          <Bell size={16} />
        )}
        {state === "on" ? "Disable notifications" : "Enable notifications"}
      </button>
      {error && <p className="px-3 text-xs text-red-600">{error}</p>}
    </>
  );
}
