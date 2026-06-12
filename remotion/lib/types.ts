/**
 * Shared types for Remotion compositions.
 *
 * Mirrors the manifest schema written by `scripts/capture-tour.ts`
 * plus the brand metadata enriched by the manifest API. Kept in
 * its own module so the composition components can import without
 * pulling in Next.js / fs.
 */

/** Sprint 15.A — punch-in hotspot animé pendant une section. Doublon
 *  léger du type côté `src/lib/types/tour.ts` pour garder ce module
 *  autonome (les composants Remotion ne doivent pas importer du Next
 *  app code — sinon le bundle Remotion tire `node:fs` et casse). */
export interface Hotspot {
  /** Secondes depuis le début de la section (après trim). */
  t: number;
  /** 0..1 horizontal dans la frame vidéo. */
  x: number;
  /** 0..1 vertical. */
  y: number;
  label: string;
  /** Facteur zoom max — default 1.6. */
  zoom?: number;
  /** Palier visible avant pull-back — default 1.5s. */
  dwellSec?: number;
}

export interface ManifestSection {
  index: number;
  categoryId: string;
  title: string;
  subtitle?: string;
  /** Filename of the per-section MP4 inside the publicDir staging
   *  directory. The composition resolves it via Remotion's
   *  `staticFile(fileName)` to get a served URL. */
  fileName: string;
  /** Per-section playback duration (seconds). The composition uses
   *  this for the timeline window AND as the OffthreadVideo cut
   *  point. May be smaller than the captured MP4 duration if a
   *  user-defined trim is in effect (Sprint UX post-capture · Phase 3). */
  durationSec: number;
  /** Original captured MP4 duration — kept around so the UI can
   *  show "trim 2s removed from a 12s capture" and the Remotion
   *  composition can fall back if trim values look stale. */
  capturedDurationSec?: number;
  /** Trim in-point in seconds (offset from MP4 start). Default 0.
   *  Passed to OffthreadVideo's `startFrom` so the section plays
   *  from this point. Set via the trim controls in the Capture tab. */
  startFromSec?: number;
  /** Sprint 15.A — punch-in hotspots animés pendant cette section.
   *  Propagés depuis le TourStep "section" par compose-tour. */
  hotspots?: Hotspot[];
  /** Edit Engine — durée du crossfade de la frontière ENTRANTE de
   *  cette section. Adaptée à la force du beat le plus proche du cut
   *  (punchy sur beat fort, longue sur passage calme). Fallback
   *  TRANSITIONS.crossfadeSec quand absent. */
  crossfadeInSec?: number;
  /** Sprint D — splash card rendue par Remotion (SectionSplash) au
   *  début de la section au lieu d'être filmée dans la page. Les
   *  captures mobiles n'ont pas de DOM à injecter ; la vidéo de la
   *  section démarre après ce délai. `durationSec` l'INCLUT. */
  postSplashSec?: number;
  /** Sprint F — extend-to-fit : freeze du dernier frame pendant ce
   *  temps en FIN de section (la narration dépasse la vidéo
   *  capturée). `durationSec` l'INCLUT ; le média ne couvre que
   *  durationSec - postSplashSec - extendTailSec. Le Ken Burns
   *  continue pendant le gel pour garder l'image vivante. */
  extendTailSec?: number;
}

/** Edit Engine — segment de voiceover.mp3 placé à un temps précis de
 *  la composition. Remplace la lecture du fichier VO en continu :
 *  chaque step parle exactement quand son visuel est à l'écran
 *  (timing vidéo réel du manifest), et le J-cut décale la première
 *  ligne d'une section dans la fin du splash précédent. */
export interface VoSegment {
  sectionIdx: number;
  /** Offset dans voiceover.mp3. */
  srcStartSec: number;
  durationSec: number;
  /** Placement en temps composition. */
  atCompSec: number;
  jCut: boolean;
}

/** Edit Engine — cue de sous-titre word-synced (karaoké), dérivée de
 *  l'alignement character-level ElevenLabs. Temps composition. */
export interface SubtitleWord {
  w: string;
  startSec: number;
  endSec: number;
}

export interface SubtitleCue {
  text: string;
  startSec: number;
  endSec: number;
  words: SubtitleWord[];
}

export interface TourBrand {
  displayName: string;
  domain: string;
  tagline: string;
}

/** Beat in the bg music timeline — emitted by `analyze-audio.ts`. */
export interface AudioBeat {
  sec: number;
  /** 0..1 normalized strength relative to the loudest beat. */
  strength: number;
}

/** Pause window in the voiceover — emitted by `analyze-audio.ts`. */
export interface VoPause {
  startSec: number;
  endSec: number;
  durationSec: number;
}

export interface TourCompositionProps extends Record<string, unknown> {
  tourId: string;
  format: "16:9" | "9:16";
  fps: number;
  sections: ManifestSection[];
  brand: TourBrand;
  /** Style preset id — drives Ken Burns intensity, transition mapping,
   *  backdrop motion, and beats layer strength. Falls back to
   *  "energetic" when missing or unknown. */
  composeStyle: string;
  /** Sprint 7 — Studio Edition only. Si set, les captures sont
   *  rendues sur un device 3D (iPhone / MacBook procédural) avec
   *  camera animée selon le preset. Gated par feature flag
   *  `frames-3d` côté SectionPlayer — Community ignore silencieusement.
   */
  frame3d?: "iphone" | "macbook";
  cameraPreset3d?: string;
  /** Path relatif au public/ d'un GLB optionnel à utiliser à la
   *  place du device procédural. Set par compose-tour si
   *  `public/models/<frame3d>.glb` existe. Permet de drop un modèle
   *  iPhone 15 Pro / MacBook réel depuis Sketchfab et qu'il
   *  remplace automatiquement le procédural. */
  frame3dGlbPath?: string;
  /** Voiceover filename inside the publicDir staging directory.
   *  Null if no VO was generated yet. */
  voiceoverFile: string | null;
  /** Bg music filename inside the publicDir staging directory.
   *  Null if no bg track is set. */
  bgMusicFile: string | null;
  bgMusicVolume: number;
  voVolume: number;
  /** Beats detected on the bg music — empty array when no music
   *  is set, or when onset detection couldn't extract a clear
   *  rhythm. Times are in seconds from the start of the bg track,
   *  which begins at composition t=0. */
  bgBeats: AudioBeat[];
  /** Pauses detected in the voice-over track. */
  voPauses: VoPause[];
  /** Edit Engine — quand présent et non-vide, la VO est jouée par
   *  segments placés (au lieu du fichier continu) : sync par
   *  construction après trim + J-cuts possibles. */
  voSegments?: VoSegment[];
  /** Edit Engine — cues karaoké word-synced. Rendues par
   *  SubtitlesLayer quand le tour opte pour `subtitles: true`. */
  subtitles?: SubtitleCue[];
}

/** Transition durations in seconds, shared between calculate-duration
 *  and the runtime crossfade interpolation. */
export const TRANSITIONS = {
  introHoldSec: 2.2,
  outroHoldSec: 2.2,
  /** Crossfade window between adjacent sections. */
  crossfadeSec: 0.65,
} as const;

/**
 * Total duration of the composition in frames. The intro + outro
 * holds are added on top of section playback ; crossfades overlap
 * adjacent sections so they don't add to the runtime.
 */
export function computeDurationInFrames(
  sections: ManifestSection[],
  fps: number,
): number {
  const sectionsSec = sections.reduce((acc, s) => acc + s.durationSec, 0);
  const total =
    TRANSITIONS.introHoldSec + sectionsSec + TRANSITIONS.outroHoldSec;
  return Math.ceil(total * fps);
}

/**
 * For each section compute its [startFrame, endFrame] window in the
 * composition timeline. Helpful for `interpolate` calls that need to
 * gate opacity / scale on a section's lifetime.
 */
export function computeSectionFrames(
  sections: ManifestSection[],
  fps: number,
): Array<{ startFrame: number; endFrame: number }> {
  const intro = TRANSITIONS.introHoldSec * fps;
  let cursor = intro;
  const out: Array<{ startFrame: number; endFrame: number }> = [];
  for (const s of sections) {
    const startFrame = cursor;
    const endFrame = cursor + s.durationSec * fps;
    out.push({ startFrame, endFrame });
    cursor = endFrame;
  }
  return out;
}
