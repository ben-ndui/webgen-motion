import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { AudioBeat, VoPause } from "./lib/types";
import type { MotionCategory } from "@/lib/motion-categories";

/**
 * Visual rhythm layer — sits on top of section players, draws a
 * subtle reactive pulse that flares briefly on each bg-music beat
 * and a soft accent ring during voice-over pauses ("breaths"). The
 * effect is intentionally low-key : you should feel it more than
 * see it, especially against busy section captures.
 *
 * - `bgBeats` : array of { sec, strength } ; we trigger an outward
 *   ripple on the nearest beat within 100ms of the current frame.
 * - `voPauses` : array of { startSec, endSec, durationSec } ; while
 *   the current time is inside a pause window, fade in a faint
 *   accent halo so the eye registers the sentence boundary.
 */
export function BeatsLayer({
  bgBeats,
  voPauses,
  activeCat,
  beatPulseStrength = 1,
  voPauseHaloStrength = 1,
}: {
  bgBeats: AudioBeat[];
  voPauses: VoPause[];
  activeCat: MotionCategory;
  beatPulseStrength?: number;
  voPauseHaloStrength?: number;
}) {
  // Hooks must run unconditionally (rules-of-hooks) — read the clock
  // before any early return.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  // Style preset can dim or hide these entirely. Skip the work
  // when both are zero so we don't render hidden DOM nodes.
  if (beatPulseStrength <= 0 && voPauseHaloStrength <= 0) {
    return null;
  }

  // ── Beat pulse ──────────────────────────────────────────────
  // Find the most recent beat that started in the last 400ms.
  // Map elapsed-since-beat → 0..1 progress, then to opacity+scale.
  const beatWindowSec = 0.4;
  let beatProgress = 1; // 1 = idle (no pulse)
  let beatStrength = 0;
  for (const b of bgBeats) {
    const dt = timeSec - b.sec;
    if (dt >= 0 && dt < beatWindowSec) {
      beatProgress = dt / beatWindowSec;
      beatStrength = b.strength;
      break;
    }
  }
  const beatOpacity =
    beatPulseStrength <= 0
      ? 0
      : interpolate(
          beatProgress,
          [0, 0.2, 1],
          [0.55 * beatStrength * beatPulseStrength, 0.25 * beatStrength * beatPulseStrength, 0],
        );
  const beatScale = interpolate(beatProgress, [0, 1], [0.6, 1.8]);

  // ── Pause halo ──────────────────────────────────────────────
  // Sustained soft glow while inside a pause window. Easy ramp in
  // / ramp out so it never snaps.
  const insidePause = voPauses.find(
    (p) => timeSec >= p.startSec && timeSec < p.endSec,
  );
  let pauseOpacity = 0;
  if (insidePause && voPauseHaloStrength > 0) {
    const local = timeSec - insidePause.startSec;
    const local01 = local / Math.max(0.05, insidePause.durationSec);
    pauseOpacity =
      interpolate(
        local01,
        [0, 0.3, 0.7, 1],
        [0, 0.18, 0.18, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      ) * voPauseHaloStrength;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Pause halo — full-screen radial that breathes during VO pauses. */}
      {pauseOpacity > 0 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, ${activeCat.accent}00 0%, ${activeCat.accent}${rgba(pauseOpacity * 0.6)} 65%, ${activeCat.accent}00 100%)`,
            opacity: pauseOpacity,
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Beat pulse — small concentric burst from the bottom-right. */}
      {beatOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "8%",
            right: "8%",
            width: 120,
            height: 120,
            borderRadius: "50%",
            transform: `scale(${beatScale})`,
            background: `radial-gradient(circle, ${activeCat.accent} 0%, ${activeCat.accent}00 65%)`,
            opacity: beatOpacity,
            mixBlendMode: "screen",
          }}
        />
      )}
    </AbsoluteFill>
  );
}

/** Convert 0..1 opacity into a 2-digit hex pair for inline gradients. */
function rgba(a: number): string {
  const v = Math.max(0, Math.min(255, Math.round(a * 255)));
  return v.toString(16).padStart(2, "0");
}
