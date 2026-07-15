"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker once on the client. Kept tiny and
 * side-effect-only so it can sit in the root layout.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      console.log("[SW] Service workers not supported");
      return;
    }
    // Register after load so it never competes with first paint.
    const onLoad = () => {
      console.log("[SW] Registering service worker...");
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Registered successfully:", reg);
          console.log("[SW] Scope:", reg.scope);
          console.log("[SW] Active:", reg.active);
        })
        .catch((err) => {
          console.error("[SW] Registration failed:", err);
          // Registration failures are non-fatal; the app still works online.
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
