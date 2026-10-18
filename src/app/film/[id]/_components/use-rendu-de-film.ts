"use client";

import { useCallback } from "react";

import type { TypeDeRendu } from "@/lib/film-store";
import { useRenduEnFlux } from "@/lib/use-rendu-en-flux";

export type { EtatDuRendu } from "@/lib/use-rendu-en-flux";

/**
 * Lance le rendu d'UNE déclinaison par `POST /api/motion/film/render` et lit
 * le flux NDJSON (phase, progress, error, done). Un seul rendu à la fois sur
 * la page : un rendu Remotion occupe déjà toute la machine. Le film et la
 * bibliothèque d'une même déclinaison ont chacun leur état (`cleDuRendu`).
 */

/** La clé d'état d'un rendu : « film:Court-FR », « bibliotheque:Court-FR », « episode:Court-FR:ep1 ». */
export function cleDuRendu(type: TypeDeRendu, nom: string, episode?: string): string {
  return episode ? `${type}:${nom}:${episode}` : `${type}:${nom}`;
}

export function useRenduDeFilm(filmId: string) {
  const { enCours, etats, lancer: lancerUnRendu, annuler } = useRenduEnFlux("/api/motion/film/render");
  const lancer = useCallback(
    (declinaison: string, type: TypeDeRendu = "film", episode?: string) =>
      lancerUnRendu(cleDuRendu(type, declinaison, episode), { filmId, declinaison, rendu: type, ...(episode ? { episode } : {}) }),
    [filmId, lancerUnRendu],
  );
  return { enCours, etats, lancer, annuler };
}
