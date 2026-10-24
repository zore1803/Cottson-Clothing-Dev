import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

// Default social-share card (links shared on WhatsApp, LinkedIn, X, Slack). Product pages supply their own photo.
export const alt = `${SITE_NAME} · ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "#113858", color: "#ffffff" }}>
        <div style={{ fontSize: 28, letterSpacing: 8, opacity: 0.7 }}>COTTSON</div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1, marginTop: 24 }}>{SITE_TAGLINE}</div>
        <div style={{ fontSize: 32, marginTop: 32, opacity: 0.85 }}>Your colours. Your logo. From one piece to bulk.</div>
      </div>
    ),
    size,
  );
}
