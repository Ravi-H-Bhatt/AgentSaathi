/* AgentSaathi service worker — offline shell + push notifications. */
const CACHE = "agentsaathi-v2";
const APP_SHELL = ["/", "/dashboard", "/offline"];

// Pre-cache a minimal shell so the app opens when offline.
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch((err) => {
      console.error("[SW] Cache failed:", err);
    })
  );
  self.skipWaiting();
});

// Drop old caches on activate.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// Network-first for navigations (always fresh data when online, cached
// fallback when offline). Cache-first for static same-origin assets.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API/auth traffic.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/offline"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
    )
  );
});

// Show a push notification sent from the server (Web Push).
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received:", event);
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
    console.log("[SW] Push payload:", payload);
  } catch (err) {
    console.error("[SW] Failed to parse push data:", err);
    payload = { title: "AgentSaathi", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "AgentSaathi";
  const options = {
    body: payload.body || "You have a new notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/dashboard" },
    tag: payload.tag || undefined,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };
  console.log("[SW] Showing notification:", title, options);
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log("[SW] Notification shown successfully"))
      .catch((err) => console.error("[SW] Failed to show notification:", err))
  );
});

// Focus/open the app when a notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
