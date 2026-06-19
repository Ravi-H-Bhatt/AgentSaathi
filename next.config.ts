import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs + canvas-ish deps that must not be bundled.
  serverExternalPackages: ["pdf-parse"],
  images: {
    remotePatterns: [
      // Google account profile images.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
