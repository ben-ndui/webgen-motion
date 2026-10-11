import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { getFilmDir } from "../film-store";
import type { Propositions } from "./remplissage";

/**
 * Ce que GEN MOTION a proposé pour un film, à côté de ses médias (hors du
 * dépôt git) : l'assistant affiche « Proposé, à vérifier » tant que la
 * valeur n'a pas changé. SERVEUR SEULEMENT.
 */
function chemin(id: string, dossierDuFilm: (id: string) => string): string {
  return join(dossierDuFilm(id), "propositions.json");
}

export function lirePropositions(id: string, dossierDuFilm: (id: string) => string = getFilmDir): Propositions {
  const fichier = chemin(id, dossierDuFilm);
  if (!existsSync(fichier)) return {};
  try {
    const brut = JSON.parse(readFileSync(fichier, "utf-8")) as unknown;
    if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return {};
    return Object.fromEntries(Object.entries(brut).filter(([, v]) => typeof v === "string")) as Propositions;
  } catch {
    return {};
  }
}

export function ecrirePropositions(id: string, propositions: Propositions, dossierDuFilm: (id: string) => string = getFilmDir): void {
  ecrireAtomiquement(chemin(id, dossierDuFilm), new TextEncoder().encode(`${JSON.stringify(propositions, null, 2)}\n`));
}
