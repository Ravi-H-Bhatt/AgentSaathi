import { ImageResponse } from "next/og";

// Serves the 512x512 PWA icon at /icon-512.png (referenced by manifest.ts).
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 320,
          fontWeight: 700,
          background: "#0a0a0a",
          color: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        A
      </div>
    ),
    { width: 512, height: 512 }
  );
}
