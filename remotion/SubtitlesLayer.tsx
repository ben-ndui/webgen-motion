import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { MotionCategory } from "@/lib/motion-categories";
import type { SubtitleCue } from "./lib/types";

/**
 * Edit Engine — word-synced karaoke subtitles.
 *
 * Cues come from the ElevenLabs character-level alignment (grouped
 * into words by edit-plan.ts), so each word lights up exactly when
 * it is spoken. Opt-in per tour via `subtitles: true` — primarily
 * aimed at the 9:16 social format where burned-in captions are the
 * norm, but works in 16:9 too.
 */
export function SubtitlesLayer({
  cues,
  format,
  activeCat,
}: {
  cues: SubtitleCue[];
  format: "16:9" | "9:16";
  activeCat: MotionCategory;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;

  const cue = cues.find((c) => nowSec >= c.startSec && nowSec < c.endSec);
  if (!cue) return null;

  // Soft pop-in over the cue's first 150ms.
  const age = nowSec - cue.startSec;
  const appear = Math.min(1, age / 0.15);
  const isPortrait = format === "9:16";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: isPortrait ? "14%" : "7%",
          transform: `translateX(-50%) translateY(${(1 - appear) * 14}px)`,
          opacity: appear,
          maxWidth: isPortrait ? "86%" : "70%",
          textAlign: "center",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Geist Sans", Inter, sans-serif',
          fontWeight: 700,
          fontSize: isPortrait ? 44 : 34,
          letterSpacing: "-0.01em",
          lineHeight: 1.25,
          padding: "14px 26px",
          borderRadius: 18,
          background: "rgba(8, 8, 12, 0.72)",
          boxShadow:
            "0 12px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
        data-wm-id="tour.subtitles"
      >
        {cue.words.map((w, i) => {
          const spoken = nowSec >= w.startSec;
          const speaking = spoken && nowSec < w.endSec + 0.08;
          return (
            <span
              key={`${i}-${w.w}`}
              style={{
                color: spoken ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                textShadow: speaking ? `0 0 18px ${activeCat.accent}aa` : undefined,
                transition: "color 80ms linear",
                marginRight: "0.32em",
                display: "inline-block",
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
