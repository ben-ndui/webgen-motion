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

  // Une phrase à la fois, effacée dès qu'elle est finie. On affiche la phrase
  // active ; une fois terminée on laisse 0.6s de grâce (le temps de finir de
  // lire) puis on CACHE — sans attendre la phrase suivante. Ça évite qu'un
  // dernier mot (« secondes ») reste collé en bas pendant les silences et
  // passe derrière les overlays d'action. Pas de backdrop-filter → pas de
  // clignotement, donc un fondu par phrase reste propre.
  const GRACE_SEC = 0.6;
  const active = cues.find((c) => nowSec >= c.startSec && nowSec < c.endSec);
  let cue = active;
  if (!cue) {
    const started = cues.filter((c) => c.startSec <= nowSec);
    const last = started[started.length - 1];
    if (last && nowSec < last.endSec + GRACE_SEC) cue = last;
  }
  if (!cue) return null;

  // Fondu d'apparition au début de CHAQUE phrase (0.18s). Sans backdrop-filter
  // c'est net, et ça marque bien chaque nouvelle phrase.
  const appear = Math.min(1, Math.max(0, (nowSec - cue.startSec) / 0.18));
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
          // ⚠️ PAS de backdrop-filter : il SCINTILLE image par image au
          // rendu Remotion/Chromium (le sous-titre « blink » à chaque frame).
          // Fond solide semi-opaque à la place — même lisibilité, zéro flicker.
          background: "rgba(8, 8, 12, 0.82)",
          boxShadow:
            "0 12px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
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
