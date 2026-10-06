import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Où vivent les médias et les rendus du mode « Film de marque », hors du
 * repo et hors de `tmpdir()` (wipé au reboot) :
 *
 *   ~/.webgen-motion/films/<id>/
 *     public/                 — `--public-dir` du rendu Remotion :
 *       <dossierDesEcrans>/   — captures réelles de l'app, une langue par dossier
 *       musique/…             — le morceau cité par `musique.fichier`
 *     out/<declinaison>.mp4   — un rendu par déclinaison de la fiche
 *
 * La fiche elle-même vit dans le repo : `films/<id>.json` (voir film-loader).
 * Même modèle que `motion-tour-store.ts`.
 */

// Un id de film ou un nom de déclinaison sert de nom de fichier : lettres,
// chiffres, `_` et `-` seulement. Ni `/`, ni `.`, donc aucun `..` possible.
const NOM_SUR = /^[\w-]+$/;

export function estNomSur(valeur: unknown): valeur is string {
  return typeof valeur === "string" && NOM_SUR.test(valeur);
}

function exigerNomSur(valeur: string, quoi: string): string {
  if (!estNomSur(valeur)) {
    throw new Error(`${quoi} invalide : « ${valeur} » (lettres, chiffres, _ et - seulement)`);
  }
  return valeur;
}

export function getFilmsBaseDir(): string {
  return join(homedir(), ".webgen-motion", "films");
}

export function getFilmDir(filmId: string): string {
  return join(getFilmsBaseDir(), exigerNomSur(filmId, "Id de film"));
}

export function getFilmPublicDir(filmId: string): string {
  return join(getFilmDir(filmId), "public");
}

export function getFilmOutDir(filmId: string): string {
  return join(getFilmDir(filmId), "out");
}

/**
 * Les trois fichiers d'un rendu, dans `out/` :
 * - `livrable` : le mp4 rendu, sous le nom de la déclinaison ;
 * - `partiel` : où Remotion écrit PENDANT le rendu. Il n'est renommé en
 *   livrable qu'une fois le rendu réussi : un rendu annulé ou en échec ne
 *   laisse jamais un mp4 partiel sous le nom du livrable ;
 * - `verrou` : présent tant qu'un rendu tourne (contient le pid du runner).
 */
export function fichiersDuRendu(dossierDeSortie: string, declinaison: string) {
  const nom = exigerNomSur(declinaison, "Nom de déclinaison");
  return {
    livrable: join(dossierDeSortie, `${nom}.mp4`),
    partiel: join(dossierDeSortie, `.${nom}.en-cours.mp4`),
    verrou: join(dossierDeSortie, `.${nom}.verrou`),
  };
}

/** URL qui sert le rendu d'une déclinaison au lecteur de la page film. */
export function urlDuRendu(filmId: string, declinaison: string, version?: number): string {
  const base = `/api/motion/film/video?id=${encodeURIComponent(filmId)}&declinaison=${encodeURIComponent(declinaison)}`;
  return version === undefined ? base : `${base}&t=${version}`;
}
