import { AbsoluteFill, interpolate } from "remotion";
import type { MotionCategory } from "@/lib/motion-categories";

/**
 * Sprint D — splash card de section rendue à la COMPOSE (Remotion)
 * au lieu d'être filmée dans la page (DOM Puppeteer). Utilisée par
 * les captures mobiles (`manifest.sections[].postSplashSec`) où il
 * n'y a pas de DOM à injecter dans l'app native.
 *
 * Miroir visuel du splash web (capture-tour.ts showSplash) : aplat
 * couleur catégorie, titre énorme, sous-titre accent, fade-in 600ms
 * scale 0.96→1, fade-out 350ms scale →1.04.
 */
export function SectionSplash({
  cat,
  title,
  subtitle,
  localFrame,
  splashFrames,
  fps,
}: {
  cat: MotionCategory;
  title: string;
  subtitle?: string;
  localFrame: number;
  splashFrames: number;
  fps: number;
}) {
  const inFrames = Math.round(0.6 * fps);
  const outFrames = Math.round(0.35 * fps);
  const opacity = interpolate(
    localFrame,
    [0, inFrames, splashFrames - outFrames, splashFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const scale = interpolate(
    localFrame,
    [0, inFrames, splashFrames - outFrames, splashFrames],
    [0.96, 1, 1, 1.04],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  if (localFrame > splashFrames) return null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: cat.bgColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 8%",
        opacity,
        transform: `scale(${scale})`,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Geist Sans", Inter, sans-serif',
      }}
      data-wm-id="tour.section-splash"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(16px, 2.2vw, 28px)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: "clamp(44px, 8.5vw, 96px)",
            fontWeight: 800,
            color: cat.fg,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            maxWidth: "min(1400px, 92%)",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: "clamp(18px, 2.5vw, 32px)",
              fontWeight: 500,
              color: cat.accent,
              letterSpacing: "-0.005em",
              lineHeight: 1.4,
              maxWidth: "min(1100px, 92%)",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
