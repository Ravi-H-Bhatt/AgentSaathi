"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

export default function TestNotificationsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  const addLog = (message: string) => {
    console.log(`[Test] ${message}`);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    
    const standalone = (window.navigator as any).standalone;
    const pwa = window.matchMedia("(display-mode: standalone)").matches || standalone;
    setIsPWA(pwa);
    
    addLog(`Platform: ${ios ? "iOS" : "Other"}`);
    addLog(`PWA mode: ${pwa ? "Yes" : "No"}`);
    addLog(`User Agent: ${userAgent.substring(0, 80)}...`);
    
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      addLog("Checking notification permission...");
      const perm = Notification.permission;
      setPermission(perm);
      addLog(`Permission: ${perm}`);

      if ("serviceWorker" in navigator) {
        addLog("Service Worker supported");
        const reg = await navigator.serviceWorker.ready;
        setSwRegistration(reg);
        addLog(`Service Worker registered: ${reg.scope}`);
        addLog(`Service Worker active: ${reg.active ? "Yes" : "No"}`);

        if ("PushManager" in window) {
          addLog("Push Manager supported");
          const sub = await reg.pushManager.getSubscription();
          setSubscription(sub);
          if (sub) {
            addLog("Push subscription exists");
            addLog(`Endpoint: ${sub.endpoint.substring(0, 60)}...`);
          } else {
            addLog("No push subscription found");
          }
        } else {
          addLog("❌ Push Manager NOT supported");
        }
      } else {
        addLog("❌ Service Worker NOT supported");
      }
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function requestPermission() {
    try {
      addLog("Requesting notification permission...");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      addLog(`Permission result: ${perm}`);
      if (perm === "granted") {
        await checkStatus();
      }
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function subscribe() {
    try {
      if (!swRegistration) {
        addLog("❌ No service worker registration");
        return;
      }
      
      addLog("Creating push subscription...");
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        addLog("❌ VAPID public key not found");
        return;
      }
      
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      
      setSubscription(sub);
      addLog("✅ Subscribed to push");
      
      addLog("Saving subscription to server...");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      
      if (res.ok) {
        addLog("✅ Subscription saved to server");
      } else {
        const text = await res.text();
        addLog(`❌ Server error: ${text}`);
      }
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function sendTestNotification() {
    try {
      addLog("Sending test notification...");
      const res = await fetch("/api/push/test", { method: "POST" });
      if (res.ok) {
        addLog("✅ Test notification sent");
      } else {
        const text = await res.text();
        addLog(`❌ Error: ${text}`);
      }
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function checkDatabase() {
    try {
      addLog("Checking database subscriptions...");
      const res = await fetch("/api/push/check");
      if (res.ok) {
        const data = await res.json();
        addLog(`✅ Database subscriptions: ${data.count}`);
        if (data.subscriptions) {
          data.subscriptions.forEach((sub: any, i: number) => {
            addLog(`  ${i + 1}. ${sub.endpoint.substring(0, 50)}... (${sub.user_agent || "unknown"})`);
          });
        }
      } else {
        addLog(`❌ Database check failed`);
      }
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell size={24} />
          Notification Diagnostic Tool
        </h1>
        <p className="text-muted mt-1">Test and debug push notifications</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted uppercase">Platform</div>
          <div className="text-lg font-semibold mt-1">{isIOS ? "iOS" : "Other"}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted uppercase">PWA Mode</div>
          <div className="text-lg font-semibold mt-1">{isPWA ? "✅ Yes" : "❌ No"}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted uppercase">Permission</div>
          <div className="text-lg font-semibold mt-1">
            {permission === "granted" ? "✅ Granted" : permission === "denied" ? "❌ Denied" : "⏳ Default"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted uppercase">Subscription</div>
          <div className="text-lg font-semibold mt-1">
            {subscription ? "✅ Active" : "❌ None"}
          </div>
        </div>
      </div>

      {/* iOS Warning */}
      {isIOS && !isPWA && (
        <div className="rounded-xl border border-orange-500 bg-orange-50 dark:bg-orange-900/20 p-4">
          <h3 className="font-semibold text-orange-900 dark:text-orange-100">⚠️ iOS Requirement</h3>
          <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
            On iOS, push notifications only work when the app is installed to your home screen. 
            Tap Share → Add to Home Screen, then open from your home screen.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={checkStatus}
            className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            1. Check Status
          </button>
          <button
            onClick={requestPermission}
            disabled={permission === "granted"}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            2. Request Permission
          </button>
          <button
            onClick={subscribe}
            disabled={permission !== "granted" || !!subscription}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            3. Subscribe
          </button>
          <button
            onClick={sendTestNotification}
            disabled={!subscription}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            4. Send Test
          </button>
          <button
            onClick={checkDatabase}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:opacity-90"
          >
            Check DB
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Debug Log</h2>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-muted hover:text-foreground"
          >
            Clear
          </button>
        </div>
        <div className="bg-black text-green-400 rounded-lg p-3 font-mono text-xs space-y-1 max-h-[400px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
