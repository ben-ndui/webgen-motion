/**
 * Sprint 15.A — Punch-in hotspots.
 *
 * Pendant la lecture d'une section, on peut highlighter un ou plusieurs
 * points cliquables (un bouton, une icône, une zone d'action) en zoomant
 * doucement vers (x, y) et en affichant un label flottant collé au point.
 *
 * Inspiré des Apple Keynote demos et de Supademo : l'œil du viewer est
 * tiré exactement où le narrateur veut, sans qu'on ait besoin de mots.
 *
 * Timeline d'un hotspot ancré à `t` secondes :
 *
 *   ramp-in (0.4s)   hold (dwellSec)   ramp-out (0.6s)
 *   ─────────────▶   ──────────────▶   ──────────────▶
 *   progress 0→1     progress 1        progress 1→0
 *
 * Pendant les rampes, on interpole `scale` cubic ease in-out depuis 1
 * jusqu'à `zoom`, en gardant `transform-origin` ancré sur (x, y). Le
 * label fade-in / fade-out en synchro.
 */

import type { Hotspot } from "./types";

/** Rampe avant le pic — temps pendant lequel le zoom monte de 1→max. */
export const RAMP_IN_SEC = 0.4;
/** Rampe après le pic — temps pendant lequel le zoom redescend max→1. */
export const RAMP_OUT_SEC = 0.6;

export interface HotspotState {
  hotspot: Hotspot;
  /** 0..1 — 0 = inactif, 1 = pic max (zoom + label opacity). */
  progress: number;
}

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Cherche le hotspot actif au frame courant. Au plus UN hotspot actif à
 * la fois — si deux fenêtres se chevauchent dans le JSON, le premier en
 * ordre `t` gagne (le designer doit espacer ses hotspots).
 *
 * Retourne `null` quand on est entre deux hotspots ou hors fenêtre.
 */
export function getActiveHotspot(
  hotspots: Hotspot[] | undefined,
  localFrame: number,
  fps: number,
): HotspotState | null {
  if (!hotspots || hotspots.length === 0) return null;
  const timeSec = localFrame / fps;
  for (const h of hotspots) {
    const dwell = h.dwellSec ?? 1.5;
    const inStart = h.t - RAMP_IN_SEC;
    const inEnd = h.t;
    const outStart = h.t + dwell;
    const outEnd = outStart + RAMP_OUT_SEC;
    if (timeSec < inStart || timeSec > outEnd) continue;

    let progress = 0;
    if (timeSec < inEnd) {
      // ramp-in
      const local = (timeSec - inStart) / RAMP_IN_SEC;
      progress = easeInOutCubic(Math.max(0, Math.min(1, local)));
    } else if (timeSec < outStart) {
      // hold
      progress = 1;
    } else {
      // ramp-out
      const local = 1 - (timeSec - outStart) / RAMP_OUT_SEC;
      progress = easeInOutCubic(Math.max(0, Math.min(1, local)));
    }
    return { hotspot: h, progress };
  }
  return null;
}

/**
 * Transform CSS du conteneur vidéo pour pousser le zoom vers (x, y).
 *
 * `transform-origin` est paramétré à (x*100%, y*100%) pour que le point
 * d'intérêt reste pile au centre de l'image pendant le zoom — sans pan
 * additionnel à calculer (le navigateur fait le boulot).
 */
export function punchInTransform(state: HotspotState | null): {
  transform: string | undefined;
  transformOrigin: string | undefined;
} {
  if (!state) return { transform: undefined, transformOrigin: undefined };
  const { hotspot, progress } = state;
  const zoom = hotspot.zoom ?? 1.6;
  const scale = 1 + (zoom - 1) * progress;
  return {
    transform: `scale(${scale})`,
    transformOrigin: `${hotspot.x * 100}% ${hotspot.y * 100}%`,
  };
}

/**
 * Style de la pill label flottante.
 *
 * Position : collée au hotspot avec un décalage diagonal vers le quart
 * de l'écran qui a le plus de place. Si le hotspot est dans le quart
 * bas-droit, le label part en haut-gauche ; etc. Le label ne sort donc
 * jamais du cadre, même près des bords.
 *
 * Le `transform: scale(...)` du conteneur vidéo agrandit aussi la pill
 * — c'est voulu : la pill grandit avec le zoom, reste lisible.
 */
export function labelStyle(state: HotspotState | null): {
  containerStyle: React.CSSProperties;
  visible: boolean;
} {
  if (!state) return { containerStyle: {}, visible: false };
  const { hotspot, progress } = state;
  // Le label vit DANS le même conteneur que la vidéo (donc dans le
  // référentiel zoomé), positionné en absolu au point (x, y). On le
  // décale ensuite via translate selon le quart.
  const offsetX = hotspot.x > 0.5 ? "-100%" : "0%";
  const offsetY = hotspot.y > 0.5 ? "-100%" : "0%";
  // Marge entre le point et le label, en pixels VIDEO (donc déjà
  // zoomés par scale()). On garde ça petit pour ne pas être éjecté
  // hors-cadre quand zoom > 2.
  const padX = hotspot.x > 0.5 ? "-12px" : "12px";
  const padY = hotspot.y > 0.5 ? "-12px" : "12px";
  return {
    visible: progress > 0.02,
    containerStyle: {
      position: "absolute",
      left: `${hotspot.x * 100}%`,
      top: `${hotspot.y * 100}%`,
      transform: `translate(calc(${offsetX} + ${padX}), calc(${offsetY} + ${padY}))`,
      opacity: progress,
      pointerEvents: "none",
    },
  };
}
