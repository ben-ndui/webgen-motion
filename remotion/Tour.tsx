import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getCategory, MOTION_CATEGORIES } from "@/lib/motion-categories";
import { SectionPlayer } from "./SectionPlayer";
import { IntroCard, OutroCard } from "./IntroOutro";
import { BeatsLayer } from "./BeatsLayer";
import { SubtitlesLayer } from "./SubtitlesLayer";
import { resolveStyle } from "./lib/style-presets";
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
  introSec,
  outroSec,
  voiceoverFile,
  bgMusicFile,
  bgMusicVolume,
  voVolume,
  bgBeats,
  voPauses,
  voSegments,
  subtitles,
  composeStyle,
  frame3d,
  cameraPreset3d,
  frame3dGlbPath,
}: TourCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = resolveStyle(composeStyle);
  // Un tour peut supprimer le carton d'ouverture (introSec: 0) : sa première
  // section porte alors le nom de la marque ET la voix off dès l'image un.
  const introHold = introSec ?? TRANSITIONS.introHoldSec;
  const outroHold = outroSec ?? TRANSITIONS.outroHoldSec;
  const sectionWindows = computeSectionFrames(sections, fps, introHold);
  const introFrames = introHold * fps;
  const outroFrames = outroHold * fps;
  const crossfadeFrames = TRANSITIONS.crossfadeSec * fps;
  const fadeFrames = Math.round(crossfadeFrames);

  // Edit Engine — per-boundary crossfade durations. The boundary
  // entering section i drives BOTH section i's entrance window and
  // section i-1's exit window, so the two sides of a cut always
  // move at the same beat-adapted pace. Intro / outro boundaries
  // keep the default.
  const entranceFramesFor = (i: number): number =>
    Math.round((sections[i]?.crossfadeInSec ?? TRANSITIONS.crossfadeSec) * fps);

  // Edit Engine — quand des segments VO sont fournis, la voix est
  // jouée par tranches placées au timing vidéo réel (J-cuts inclus).
  // Sinon fallback : le fichier continu, comme avant.
  const voSegs = voSegments ?? [];

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

  // Les couleurs de la marque, si le tour les déclare, remplacent celles de
  // la catégorie — sans quoi toute vidéo Maki sortirait en bleu Branding.
  const paintBrand = (cat: typeof activeCat) =>
    brand.bgColor || brand.accent || brand.fg
      ? {
          ...cat,
          bgColor: brand.bgColor ?? cat.bgColor,
          accent: brand.accent ?? cat.accent,
          fg: brand.fg ?? cat.fg,
        }
      : cat;

  activeCat = paintBrand(activeCat);

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
            Math.sin((frame / fps) * (style.backdropFreq * 1.33)),
            [-1, 1],
            [1 - style.backdropOpacityAmp, 1],
          ),
          transform: `scale(${interpolate(
            Math.sin((frame / fps) * style.backdropFreq),
            [-1, 1],
            [1.0, 1.0 + style.backdropScaleAmp],
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

      {/* Section players wrapped in <Sequence>. The Sequence aligns
       *  each OffthreadVideo's media t=0 with the section's intended
       *  startFrame on the composition timeline — without it, every
       *  section's video starts playing at composition t=0 and ends
       *  long before its window opens, producing the dreaded
       *  "first 1-2 clips, then black" symptom.
       *
       *  premountFor=crossfadeFrames gives Remotion enough lead to
       *  decode the next clip before the previous one starts its
       *  exit crossfade, so the transition stays smooth.
       *
       *  durationInFrames is extended by crossfadeFrames so the exit
       *  window of section N stays visible while section N+1 enters. */}
      {sections.map((s, i) => {
        const w = sectionWindows[i];
        const cat = paintBrand(getCategory(s.categoryId) ?? MOTION_CATEGORIES.branding);
        const durationFrames = w.endFrame - w.startFrame;
        const entranceFrames = entranceFramesFor(i);
        const exitFrames =
          i < sections.length - 1
            ? entranceFramesFor(i + 1)
            : Math.round(crossfadeFrames);
        return (
          <Sequence
            key={s.index}
            from={w.startFrame}
            durationInFrames={durationFrames + exitFrames}
            layout="none"
          >
            <SectionPlayer
              section={s}
              cat={cat}
              format={format}
              url={`${brand.domain}${pathHintFor(s)}`}
              durationFrames={durationFrames}
              entranceFrames={entranceFrames}
              exitFrames={exitFrames}
              sectionIndex={i}
              styleId={composeStyle}
              frame3d={frame3d}
              cameraPreset3d={cameraPreset3d}
              frame3dGlbPath={frame3dGlbPath}
            />
          </Sequence>
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
        beatPulseStrength={style.beatPulseStrength}
        voPauseHaloStrength={style.voPauseHaloStrength}
      />

      {/* Word-synced karaoke subtitles (Edit Engine, opt-in). */}
      {subtitles && subtitles.length > 0 && (
        <SubtitlesLayer cues={subtitles} format={format} activeCat={activeCat} />
      )}

      {/* Audio overlays at the root — Remotion mixes them automatically
       *  with the OffthreadVideo's silent track.
       *
       *  Edit Engine : quand voSegments est fourni, chaque tranche de
       *  voiceover.mp3 est placée à son temps composition exact
       *  (timing vidéo réel + J-cuts). Le fichier continu reste le
       *  fallback pour les renders sans alignment. */}
      {voiceoverFile && voSegs.length > 0
        ? voSegs.map((seg, i) => (
            <Sequence
              key={`vo-${i}`}
              from={Math.round(seg.atCompSec * fps)}
              durationInFrames={Math.max(1, Math.round(seg.durationSec * fps))}
              layout="none"
            >
              <Audio
                src={staticFile(voiceoverFile)}
                startFrom={Math.round(seg.srcStartSec * fps)}
                volume={voVolume}
              />
            </Sequence>
          ))
        : voiceoverFile && (
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
