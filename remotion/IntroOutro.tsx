import { AbsoluteFill, interpolate } from "remotion";
import type { MotionCategory } from "@/lib/motion-categories";

/**
 * Intro card — bold tour title centered on the first section's
 * category backdrop. Fades in over the first 30 frames, holds, then
 * fades out as the first section's video crosses in.
 */
export function IntroCard({
  cat,
  brandDisplayName,
  sectionCount,
  localFrame,
  durationFrames,
  fadeFrames,
}: {
  cat: MotionCategory;
  brandDisplayName: string;
  sectionCount: number;
  localFrame: number;
  durationFrames: number;
  fadeFrames: number;
}) {
  const opacity = interpolate(
    localFrame,
    [0, fadeFrames, durationFrames - fadeFrames, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 18,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "white",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: cat.accent,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {sectionCount} chapitre{sectionCount > 1 ? "s" : ""}
      </div>
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          maxWidth: "80%",
        }}
      >
        {brandDisplayName}
      </div>
    </AbsoluteFill>
  );
}

/**
 * Outro card — big brand logo + tagline on the LAST section's
 * category color. Mirror of the intro fade pattern.
 */
export function OutroCard({
  cat,
  brandDisplayName,
  brandTagline,
  localFrame,
  durationFrames,
  fadeFrames,
}: {
  cat: MotionCategory;
  brandDisplayName: string;
  brandTagline: string;
  localFrame: number;
  durationFrames: number;
  fadeFrames: number;
}) {
  const opacity = interpolate(
    localFrame,
    [0, fadeFrames, durationFrames - fadeFrames, durationFrames],
    [0, 1, 1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
        color: cat.fg,
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          maxWidth: "85%",
        }}
      >
        {brandDisplayName}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: cat.accent,
          letterSpacing: "-0.005em",
        }}
      >
        {brandTagline}
      </div>
    </AbsoluteFill>
  );
}
