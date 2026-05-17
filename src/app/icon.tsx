import { ImageResponse } from "next/og";

/**
 * Favicon généré via next/og — vire le favicon Vercel par défaut.
 * Sprint 11 — branding genmotion.app.
 *
 * Format : 32×32 PNG, fond blanc, monogramme "GM" noir bold.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#0a0a0a",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        GM
      </div>
    ),
    size,
  );
}
