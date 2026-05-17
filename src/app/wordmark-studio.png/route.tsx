import { ImageResponse } from "next/og";

/**
 * Route GET /wordmark-studio.png — wordmark Studio Edition rasterizé
 * en PNG 512×512 pour upload comme product image dans Stripe Dashboard.
 * Sprint 11 — Stripe checkout product setup.
 */
export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 110,
            fontWeight: 600,
            letterSpacing: "-0.05em",
            lineHeight: 0.95,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div>GEN</div>
          <div>MOTION</div>
        </div>
        <div
          style={{
            width: 80,
            height: 2,
            background: "#0a0a0a",
            marginTop: 40,
            marginBottom: 22,
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "0.35em",
            color: "#52525b",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          STUDIO EDITION
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
