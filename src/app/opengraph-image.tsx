import { ImageResponse } from "next/og";

/**
 * Open Graph image — affichée quand genmotion.app est partagé sur
 * Twitter/LinkedIn/Slack/Discord/iMessage. 1200×630 PNG.
 * Sprint 11 — branding genmotion.app.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GEN MOTION — Motion Studio local-first";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          color: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
          padding: "80px 100px",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#71717a",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          Motion Studio · local-first · 2026
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 160,
              fontWeight: 600,
              letterSpacing: "-0.06em",
              lineHeight: 0.95,
              color: "#0a0a0a",
            }}
          >
            GEN MOTION.
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 400,
              color: "#71717a",
              marginTop: 16,
              maxWidth: 800,
              lineHeight: 1.3,
            }}
          >
            On capture votre site, vous obtenez un clip motion.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            color: "#52525b",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <div>genmotion.app</div>
          <div>Smooth &amp; Design · Nice</div>
        </div>
      </div>
    ),
    size,
  );
}
