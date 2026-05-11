import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Sanity-check composition. Animates a title + subtitle over a
 * dark backdrop : the title fades in (frames 0-30), the subtitle
 * slides up underneath (frames 15-45). Total runtime 3s @ 30fps.
 *
 * Purpose : prove that the Remotion CLI can find our entry point,
 * resolve our React 19 / TSX setup, and produce a playable MP4.
 */
export function HelloWorld({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [fps / 2, fps * 1.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [fps / 2, fps * 1.5], [24, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 70%)",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "white",
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          opacity: titleOpacity,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "0.04em",
          color: "#94a3b8",
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
}
