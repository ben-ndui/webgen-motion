import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { estNomSur, getFilmOutDir } from "../film-store";

/**
 * Les captures montrées EN DIRECT pendant « Remplir depuis ton site ».
 * Rangées à part, dans `out/<film>/remplissage/`, et pas dans la fiche :
 * les vraies cases ne se remplissent qu'à la fin, selon la règle « ce qui
 * existe n'est jamais remplacé ». Vidées à chaque nouveau remplissage.
 * SERVEUR SEULEMENT.
 */
export const APERCUS_MAXIMUM = 40;

function dossierDesApercus(filmId: string): string {
  return join(getFilmOutDir(filmId), "remplissage");
}

export function viderLesApercus(filmId: string): void {
  rmSync(dossierDesApercus(filmId), { recursive: true, force: true });
}

export function poserUnApercu(filmId: string, numero: number, image: Uint8Array): void {
  mkdirSync(dossierDesApercus(filmId), { recursive: true });
  ecrireAtomiquement(join(dossierDesApercus(filmId), `apercu-${numero}.png`), image);
}

/** Le chemin d'un aperçu existant, ou null : id et numéro vérifiés, aucun autre fichier ne se lit. */
export function cheminDUnApercu(filmId: unknown, numero: unknown): string | null {
  if (!estNomSur(filmId)) return null;
  const n = Number(numero);
  if (!Number.isInteger(n) || n < 1 || n > APERCUS_MAXIMUM) return null;
  const chemin = join(dossierDesApercus(filmId), `apercu-${n}.png`);
  return existsSync(chemin) ? chemin : null;
}
