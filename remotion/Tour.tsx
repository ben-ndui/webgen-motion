import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getCategory, MOTION_CATEGORIES } from "@/lib/motion-categories";
import { SectionPlayer } from "./SectionPlayer";
import { IntroCard, OutroCard } from "./IntroOutro";
import { BeatsLayer } from "./BeatsLayer";
import {
  computeSectionFrames,
  TRANSITIONS,
  type TourCompositionProps,
} from "./lib/types";

/**
 * Main tour composition. Iso-functional port of the existing
 * `/compose/[id]` React stage : a colored backdrop that fades
 * between section categories, an intro card up front, a series
 * of section players (each in its Mac chrome / iPhone frame),
 * and an outro logo card at the end. Voice-over + bg music are
 * laid in at the root as `<Audio>` tracks.
 *
 * No motion-design fanciness yet — chunks 3+ will add Ken Burns,
 * varied transitions and beat-driven cuts.
 */
export function Tour({
  format,
  sections,
  brand,
  voiceoverFile,
  bgMusicFile,
  bgMusicVolume,
  voVolume,
  bgBeats,
  voPauses,
}: TourCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sectionWindows = computeSectionFrames(sections, fps);
  const introFrames = TRANSITIONS.introHoldSec * fps;
  const outroFrames = TRANSITIONS.outroHoldSec * fps;
  const crossfadeFrames = TRANSITIONS.crossfadeSec * fps;
  const fadeFrames = Math.round(crossfadeFrames);

  // Active section / phase to pick the backdrop color.
  let activeCat = MOTION_CATEGORIES.branding;
  if (frame < introFrames) {
    activeCat = getCategory(sections[0]?.categoryId) ?? activeCat;
  } else {
    const idx = sectionWindows.findIndex(
      (w) => frame >= w.startFrame && frame < w.endFrame,
    );
    const section = idx >= 0 ? sections[idx] : sections[sections.length - 1];
    activeCat = getCategory(section?.categoryId) ?? activeCat;
  }

  const totalSectionsEnd = sectionWindows[sectionWindows.length - 1]?.endFrame ?? introFrames;
  const outroStart = totalSectionsEnd;
  const outroEnd = outroStart + outroFrames;
  const inIntro = frame < introFrames;
  const inOutro = frame >= outroStart && frame < outroEnd;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: activeCat.bgColor,
        // Subtle background-color crossfade is handled by React
        // re-rendering with the new activeCat ; transition is then
        // smoothed by the radial accents below scaling slightly.
        transition: "background-color 600ms cubic-bezier(0.22,0.61,0.36,1)",
      }}
    >
      {/* Radial accents — slow breathing scale + opacity oscillation
       *  so the backdrop never feels static, even on long sections. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at top right, ${activeCat.accent}22, transparent 60%), radial-gradient(ellipse at bottom left, ${activeCat.accent}1a, transparent 50%)`,
          opacity: interpolate(
            Math.sin((frame / fps) * 0.6),
            [-1, 1],
            [0.7, 1],
          ),
          transform: `scale(${interpolate(
            Math.sin((frame / fps) * 0.45),
            [-1, 1],
            [1.0, 1.06],
          )})`,
          transformOrigin: "center",
          pointerEvents: "none",
        }}
      />

      {/* Intro card */}
      {inIntro && (
        <IntroCard
          cat={activeCat}
          brandDisplayName={brand.displayName}
          sectionCount={sections.length}
          localFrame={frame}
          durationFrames={introFrames}
          fadeFrames={fadeFrames}
        />
      )}

      {/* Section players — ALL mounted at all times so OffthreadVideo
       *  can decode the next clip ahead of its visible window. Without
       *  this pre-mount, switching to a section's first frame meets a
       *  not-yet-decoded source and renders a black flash inside the
       *  device frame for a few hundred ms. The cost is keeping a
       *  handful of decoders alive simultaneously — fine for this
       *  workload. Visibility is gated by the per-player opacity
       *  computed from the transition window. */}
      {sections.map((s, i) => {
        const w = sectionWindows[i];
        const cat = getCategory(s.categoryId) ?? MOTION_CATEGORIES.branding;
        const localFrame = frame - w.startFrame;
        const durationFrames = w.endFrame - w.startFrame;
        return (
          <SectionPlayer
            key={s.index}
            section={s}
            cat={cat}
            format={format}
            url={`${brand.domain}${pathHintFor(s)}`}
            localFrame={localFrame}
            durationFrames={durationFrames}
            crossfadeFrames={crossfadeFrames}
            sectionIndex={i}
          />
        );
      })}

      {/* Outro card */}
      {inOutro && (
        <OutroCard
          cat={activeCat}
          brandDisplayName={brand.displayName}
          brandTagline={brand.tagline}
          localFrame={frame - outroStart}
          durationFrames={outroFrames}
          fadeFrames={fadeFrames}
        />
      )}

      {/* Reactive beats / pause halos on top of sections, below audio. */}
      <BeatsLayer
        bgBeats={bgBeats}
        voPauses={voPauses}
        activeCat={activeCat}
      />

      {/* Audio overlays at the root — Remotion mixes them automatically
       *  with the OffthreadVideo's silent track. */}
      {voiceoverFile && (
        <Audio src={staticFile(voiceoverFile)} volume={voVolume} />
      )}
      {bgMusicFile && (
        <Audio src={staticFile(bgMusicFile)} volume={bgMusicVolume} />
      )}
    </AbsoluteFill>
  );
}

/** Cosmetic path hint shown in the Mac chrome URL bar — derived
 *  from the section's categoryId. */
function pathHintFor(s: { categoryId: string }): string {
  if (s.categoryId === "pricing") return "/pricing";
  if (s.categoryId === "branding") return "/";
  if (s.categoryId === "stores" || s.categoryId === "releases") return "/admin/deploys";
  if (s.categoryId === "ai") return "/admin/ai";
  if (s.categoryId === "motion") return "/admin/motion-studio";
  if (s.categoryId === "pipeline") return "/admin/deploys";
  return "";
}
