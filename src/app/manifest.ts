import type { MetadataRoute } from "next";

/**
 * PWA web app manifest. Makes AgentSaathi installable to the home screen
 * and run in a standalone (app-like) window on mobile and desktop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgentSaathi — Insurance Agent Workspace",
    short_name: "AgentSaathi",
    description:
      "Manage clients, policies, renewals and premiums with an AI assistant grounded in your own data.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    categories: ["business", "finance", "productivity"],
    // iOS requires specific icon configurations
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Full-bleed maskable icon so Android doesn't crop/ring the logo.
        src: "/icon-maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Better iOS PWA support
    dir: "ltr",
    lang: "en",
    prefer_related_applications: false,
  };
}
