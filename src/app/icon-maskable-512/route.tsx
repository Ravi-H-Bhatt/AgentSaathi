import { ImageResponse } from "next/og";

/**
 * Maskable PWA icon (Android home screen).
 *
 * Android masks home-screen icons into a circle/squircle and adds a background.
 * A maskable icon MUST be full-bleed (background fills the entire canvas) with
 * the important content kept inside the inner 80% "safe zone". Our previous
 * maskable icon reused the non-full-bleed logo, so Android cropped it and drew
 * a white ring. This route renders the brand arrow on a solid black canvas with
 * generous safe-zone padding so it looks correct after masking.
 */
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
        {/* Arrow sized ~44% of the 512 canvas → well within the 80% safe zone */}
        <svg width="230" height="230" viewBox="0 0 32 32" fill="none">
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
    { width: 512, height: 512 }
  );
}
