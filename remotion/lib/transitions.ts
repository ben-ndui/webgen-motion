/**
 * Per-section transition presets. Each entry returns CSS transform /
 * filter / clip-path values for the section's entrance and exit. The
 * mapping `pickTransition` chooses a preset from the section's
 * categoryId so the same template feels different end-to-end.
 *
 * `t` is a 0..1 progress value: 0 at the transition start, 1 at the
 * end. The composition passes either entranceProgress (rising 0→1
 * at the section's start) or exitProgress (falling 1→0 at its end).
 */

export type TransitionId =
  | "fade"
  | "scale-blur"
  | "swipe"
  | "wipe-down"
  | "glitch";

export interface TransitionStyle {
  opacity: number;
  transform: string;
  filter?: string;
  clipPath?: string;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Plain fade — calm, clean for branding intros. */
function fade(t: number): TransitionStyle {
  return {
    opacity: t,
    transform: `scale(${0.96 + 0.04 * easeOut(t)})`,
  };
}

/** Scale-up + blur, releases energy → motion / ai categories. */
function scaleBlur(t: number): TransitionStyle {
  const e = easeOut(t);
  return {
    opacity: t,
    transform: `scale(${0.88 + 0.12 * e})`,
    filter: `blur(${(1 - e) * 14}px) saturate(${0.8 + 0.2 * e})`,
  };
}

/** Horizontal swipe — section enters from the right edge. Good for
 *  showcase / features. */
function swipe(t: number): TransitionStyle {
  const e = easeInOut(t);
  return {
    opacity: Math.min(1, t * 1.5),
    transform: `translateX(${(1 - e) * 60}px) scale(${0.97 + 0.03 * e})`,
  };
}

/** Vertical reveal via clip-path — clean, announces a new chapter. */
function wipeDown(t: number): TransitionStyle {
  const e = easeOut(t);
  return {
    opacity: 1,
    transform: `scale(${0.99 + 0.01 * e})`,
    clipPath: `inset(${(1 - e) * 100}% 0 0 0)`,
  };
}

/** Glitch — tiny chromatic shift + skip. Suits ai / pipeline. */
function glitch(t: number): TransitionStyle {
  const e = easeOut(t);
  // Small randomized jitter that converges to zero — uses t as seed
  // so it's deterministic per frame.
  const jitter = (1 - e) * 6 * Math.sin(t * 53);
  return {
    opacity: t < 0.1 ? 0 : t < 0.2 ? 0.4 : t,
    transform: `translate(${jitter}px, ${jitter * 0.3}px) scale(${0.95 + 0.05 * e})`,
    filter: `hue-rotate(${(1 - e) * 18}deg) saturate(${1 + (1 - e) * 0.6})`,
  };
}

const PRESETS: Record<TransitionId, (t: number) => TransitionStyle> = {
  fade,
  "scale-blur": scaleBlur,
  swipe,
  "wipe-down": wipeDown,
  glitch,
};

/**
 * Pick a transition style per categoryId. Falls back to `fade` when
 * the category is unknown so we never crash on a tour that defines
 * its own custom categories.
 */
const CATEGORY_TRANSITION: Record<string, TransitionId> = {
  branding: "fade",
  motion: "scale-blur",
  features: "swipe",
  stores: "wipe-down",
  releases: "wipe-down",
  ai: "glitch",
  pipeline: "glitch",
  pricing: "swipe",
  default: "fade",
};

export function pickTransition(
  categoryId: string,
  /** When provided, force every section to this transition — used
   *  by style presets that want a uniform look (sober → fade,
   *  cinematic → wipe-down, glitch → glitch). */
  styleOverride?: TransitionId | null,
): TransitionId {
  if (styleOverride) return styleOverride;
  return CATEGORY_TRANSITION[categoryId] ?? CATEGORY_TRANSITION.default;
}

export function applyTransition(
  id: TransitionId,
  progress: number,
): TransitionStyle {
  const clamped = Math.max(0, Math.min(1, progress));
  return PRESETS[id](clamped);
}

/**
 * Ken Burns transform — slow zoom + subtle pan alternating per
 * section index. `local01` is 0..1 across the section's full
 * duration ; `idx` decides pan direction so adjacent sections feel
 * different even when the same category repeats.
 *
 * `scaleAmp` and `panAmp` come from the active style preset so a
 * "sober" tour gets a barely-perceptible zoom and a "glitch" one
 * gets a strong one.
 */
export function kenBurns(
  local01: number,
  idx: number,
  scaleAmp = 0.06,
  panAmp = 1.4,
): string {
  const scale = 1.0 + scaleAmp * local01;
  const panX = (idx % 2 === 0 ? -1 : 1) * (1 - local01) * panAmp;
  const panY = (idx % 3 === 0 ? -1 : 1) * (1 - local01) * panAmp * 0.57;
  return `scale(${scale}) translate(${panX}%, ${panY}%)`;
}
