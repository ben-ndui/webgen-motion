import { ImageResponse } from "next/og";

/**
 * Apple touch icon — affiché quand un user "Add to Home Screen" sur
 * iOS Safari. 180×180 PNG. Sprint 11 — branding genmotion.app.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: "-0.05em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        GM
      </div>
    ),
    size,
  );
}
