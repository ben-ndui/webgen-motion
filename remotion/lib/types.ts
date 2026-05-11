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
   *  point — `analyze-audio.ts` may shorten it relative to the
   *  captured MP4 if the VO ends earlier than the visual. */
  durationSec: number;
  /** Original captured MP4 duration — kept around so chunk 5 can
   *  reference the pre-trim length if needed. */
  capturedDurationSec?: number;
}

export interface TourBrand {
  displayName: string;
  domain: string;
  tagline: string;
}

export interface TourCompositionProps extends Record<string, unknown> {
  tourId: string;
  format: "16:9" | "9:16";
  fps: number;
  sections: ManifestSection[];
  brand: TourBrand;
  /** Voiceover filename inside the publicDir staging directory.
   *  Null if no VO was generated yet. */
  voiceoverFile: string | null;
  /** Bg music filename inside the publicDir staging directory.
   *  Null if no bg track is set. */
  bgMusicFile: string | null;
  bgMusicVolume: number;
  voVolume: number;
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
