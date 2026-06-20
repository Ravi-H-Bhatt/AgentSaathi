import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move the dev-only route indicator out of the sidebar's way (bottom-left).
  devIndicators: {
    position: "bottom-right",
  },
  images: {
    remotePatterns: [
      // Google account profile images.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
