import { ImageResponse } from "next/og";

// Serves the 192x192 PWA icon at /icon-192.png (referenced by manifest.ts).
// Brand arrow on a solid black tile — matches the iOS/home-screen icon so the
// installed Android (WebAPK) launcher icon shows the logo, not a letter.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path
            d="M9 20.5L14 15l3 3 6-7"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 11h4v4"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
