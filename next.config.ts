import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move the dev-only route indicator out of the sidebar's way (bottom-left).
  devIndicators: {
    position: "bottom-right",
  },
  // pdfjs-dist must NOT be bundled by Next/Turbopack — bundling mangles its
  // internal worker/module resolution and breaks text extraction on Vercel.
  // Keeping it external makes the serverless function load the real package.
  serverExternalPackages: ["pdfjs-dist"],
  // Vercel's file tracer can't follow the runtime workerSrc string, so it would
  // otherwise omit the worker .mjs from the lambda. Force-include the whole
  // pdfjs build dir into the routes that extract PDFs.
  outputFileTracingIncludes: {
    "/api/extract": ["./node_modules/pdfjs-dist/legacy/build/**"],
    "/api/policies/bulk": ["./node_modules/pdfjs-dist/legacy/build/**"],
  },
  images: {
    remotePatterns: [
      // Google account profile images.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
