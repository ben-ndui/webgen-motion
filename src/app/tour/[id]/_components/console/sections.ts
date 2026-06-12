/**
 * Director's Console — découpage ordinal du tour en sections.
 *
 * Une "section" au sens console = un step `section` + tous les steps
 * qui le suivent jusqu'au prochain step `section`. L'ordinal (0-based,
 * S1 = ordinal 0) est la clé partagée par `@Sn`, la timeline Z2,
 * `scopeSection` et `touchedSections`.
 */
import type { TourEntry, TourStep } from "@/lib/types/tour";

export interface SectionInfo {
  /** Ordinal 0-based — S1 = 0. */
  ordinal: number;
  /** Index du step `section` dans tour.steps. */
  stepIndex: number;
  /** Index (exclusif) de fin de la plage de steps de la section. */
  endIndex: number;
  title: string;
  /** Durée estimée (secondes) depuis les dwellMs des steps. */
  estimatedSec: number;
}

/** Dwell effectif d'un step — même heuristique que le tab Script. */
export function dwellOf(s: TourStep): number {
  if (s.type === "wait") return s.dwellMs;
  if ("dwellMs" in s && s.dwellMs) return s.dwellMs;
  return 1200;
}

export function sectionsOf(tour: TourEntry): SectionInfo[] {
  const out: SectionInfo[] = [];
  tour.steps.forEach((step, i) => {
    if (step.type === "section") {
      out.push({
        ordinal: out.length,
        stepIndex: i,
        endIndex: tour.steps.length,
        title: step.title,
        estimatedSec: 0,
      });
    }
  });
  out.forEach((s, k) => {
    if (k < out.length - 1) s.endIndex = out[k + 1].stepIndex;
    let ms = 0;
    for (let i = s.stepIndex; i < s.endIndex; i++) ms += dwellOf(tour.steps[i]);
    s.estimatedSec = ms / 1000;
  });
  return out;
}

/** Ordinal de section contenant un index de step (−1 si avant S1). */
export function sectionOrdinalOfStep(sections: SectionInfo[], stepIndex: number): number {
  for (let k = sections.length - 1; k >= 0; k--) {
    if (stepIndex >= sections[k].stepIndex) return k;
  }
  return -1;
}
