import type { TransitionId } from "./transitions";

/**
 * Style presets — named bundles of every motion-design knob the
 * composition exposes. The user picks one per tour ; the runner
 * passes the resolved preset to the composition which dimensions
 * each effect accordingly.
 *
 * Adding a new preset = adding a key here + (optional) UI label.
 * The composition layers all consume `ComposeStyle` ; nothing else
 * to touch downstream.
 */

export type ComposeStyleId =
  | "flat"
  | "sober"
  | "energetic"
  | "cinematic"
  | "glitch";

export interface ComposeStyle {
  /** Display label used by the Compose tab dropdown. */
  label: string;
  /** One-liner shown as tooltip. */
  hint: string;

  // ── Ken Burns ────────────────────────────────────────────
  /** Max scale delta added on top of 1.0 over the section's full
   *  duration. 0 = no zoom. */
  kenBurnsScale: number;
  /** Max pan amount in % of the device frame. 0 = no pan. */
  kenBurnsPan: number;

  // ── Transitions ──────────────────────────────────────────
  /** When non-null, every section uses this transition regardless
   *  of its categoryId. When null, the per-category default applies
   *  (see remotion/lib/transitions.ts CATEGORY_TRANSITION). */
  transitionOverride: TransitionId | null;

  // ── Backdrop motion (the radial gradient under sections) ──
  /** Amplitude of the scale oscillation. 0 = static. */
  backdropScaleAmp: number;
  /** Amplitude of the opacity oscillation. 0 = static. */
  backdropOpacityAmp: number;
  /** Frequency multiplier for the breathing sine. */
  backdropFreq: number;

  // ── Beats layer (BeatsLayer.tsx) ─────────────────────────
  /** Strength multiplier on the bg-music beat pulse. 0 = hidden. */
  beatPulseStrength: number;
  /** Strength multiplier on the VO-pause halo. 0 = hidden. */
  voPauseHaloStrength: number;
}

const STYLES: Record<ComposeStyleId, ComposeStyle> = {
  // Zéro tuilage garanti. AUCUN scale nulle part (Ken Burns 0 + backdrop
  // scale 0) et fondu opacité pure : le tuilage du compositeur GL vient
  // exclusivement d'une couche qui combine transform/scale + opacité < 1,
  // donc en supprimant tout scale il ne peut plus apparaître. Le backdrop
  // ne fait qu'osciller en opacité (l'opacité seule ne tuile pas). À utiliser
  // pour les démos produit "flat design" / clients sensibles à l'artefact.
  flat: {
    label: "Flat",
    hint: "Zéro mouvement de scale — anti-tuilage garanti",
    kenBurnsScale: 0,
    kenBurnsPan: 0,
    transitionOverride: "fade",
    backdropScaleAmp: 0,
    backdropOpacityAmp: 0.08,
    backdropFreq: 0.25,
    beatPulseStrength: 0,
    voPauseHaloStrength: 0,
  },

  // Calm + documentary. Almost no motion. Suits corporate intros,
  // legal / financial demos where flashy is wrong.
  sober: {
    label: "Sober",
    hint: "Mouvement minimal — corporate / documentary",
    kenBurnsScale: 0.02,
    kenBurnsPan: 0.4,
    transitionOverride: "fade",
    backdropScaleAmp: 0,
    backdropOpacityAmp: 0.1,
    backdropFreq: 0.3,
    beatPulseStrength: 0,
    voPauseHaloStrength: 0,
  },

  // Default and current behavior. Strong but balanced motion design.
  energetic: {
    label: "Energetic",
    hint: "Look produit / SaaS punchy (défaut)",
    kenBurnsScale: 0.06,
    kenBurnsPan: 1.4,
    transitionOverride: null,
    backdropScaleAmp: 0,
    backdropOpacityAmp: 0.3,
    backdropFreq: 0.45,
    beatPulseStrength: 1.0,
    voPauseHaloStrength: 1.0,
  },

  // Slow + classy — fade + wipe only, very gentle Ken Burns,
  // subtle halo, no beat pulse. Suits storytelling / portfolio.
  cinematic: {
    label: "Cinematic",
    hint: "Storytelling lent, fades + wipes, halo subtil",
    kenBurnsScale: 0.04,
    kenBurnsPan: 0.8,
    transitionOverride: "wipe-down",
    backdropScaleAmp: 0,
    backdropOpacityAmp: 0.2,
    backdropFreq: 0.25,
    beatPulseStrength: 0,
    voPauseHaloStrength: 0.7,
  },

  // Tech / AI vibe. Glitch everywhere, max pulses + halos, maximal
  // Ken Burns. Used carefully or it gets visually noisy fast.
  glitch: {
    label: "Glitch",
    hint: "Esthétique tech / AI — glitch sur chaque transition",
    kenBurnsScale: 0.08,
    kenBurnsPan: 1.8,
    transitionOverride: "glitch",
    backdropScaleAmp: 0,
    backdropOpacityAmp: 0.4,
    backdropFreq: 0.6,
    beatPulseStrength: 1.3,
    voPauseHaloStrength: 1.2,
  },
};

export const COMPOSE_STYLE_IDS: ComposeStyleId[] = [
  "flat",
  "sober",
  "energetic",
  "cinematic",
  "glitch",
];

export const DEFAULT_COMPOSE_STYLE: ComposeStyleId = "energetic";

export function resolveStyle(id?: string | null): ComposeStyle {
  if (id && id in STYLES) return STYLES[id as ComposeStyleId];
  return STYLES[DEFAULT_COMPOSE_STYLE];
}

export function listStyles(): Array<{ id: ComposeStyleId } & ComposeStyle> {
  return COMPOSE_STYLE_IDS.map((id) => ({ id, ...STYLES[id] }));
}
