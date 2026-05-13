/**
 * Shared types for Remotion compositions.
 *
 * Mirrors the manifest schema written by `scripts/capture-tour.ts`
 * plus the brand metadata enriched by the manifest API. Kept in
 * its own module so the composition components can import without
 * pulling in Next.js / fs.
 */

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
