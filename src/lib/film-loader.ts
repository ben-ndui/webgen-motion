import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { FilmSpec } from "../../remotion/film/spec";
import { erreursDeLaBibliotheque } from "../../remotion/film/bibliotheque/validerBibliotheque";
import { erreursDuCinema } from "../../remotion/film/cinema/validerCinema";
import { erreursDeLaSpec } from "../../remotion/film/validerSpec";
import { estNomSur } from "./film-store";

/**
 * Chargeur des fiches du mode « Film de marque » : `<id>.json` dans le
 * dossier des fiches (getFilmsDir), au format `FilmSpec` (remotion/film/spec.ts).
 *
 * SERVEUR SEULEMENT (node:fs) : comme tour-loader, ne jamais l'importer dans
 * un client component. La page lit côté serveur et passe les données en props.
 *
 * Une fiche illisible ou invalide n'est PAS ignorée : elle remonte avec ses
 * erreurs, pour que l'écran dise quoi corriger au lieu d'afficher « aucun
 * film » (une erreur avalée ressemble à du vide).
 */

export type FicheDeFilm =
  | { id: string; etat: "valide"; spec: FilmSpec }
  | { id: string; etat: "invalide"; erreurs: string[] };

/** Le film a une série (import bible, écrite à la main ou via Claude). Sert
 *  au profil d'interface « série » (cf. /setup/interface) pour ne lister que
 *  ces films-là sur une install dédiée à une cliente comme Brigitte. */
export function estUneSerie(fiche: FicheDeFilm): boolean {
  return fiche.etat === "valide" && !!fiche.spec.cinema;
}

/**
 * Où vivent les fiches. En développement : `films/` à la racine du repo.
 * Dans l'app installée (la coque pose WEBGEN_RUNNERS_DIR, transmise aux
 * runners) : `~/.webgen-motion/fiches/`. Le serveur et les runners y ont
 * chacun leur dossier courant DANS l'app (standalone/ et runners/) : avec
 * le dossier courant, le serveur écrivait une fiche que le rendu ne trouvait
 * pas, dans une app signée, effacée à chaque mise à jour (15/10/2026).
 */
export function getFilmsDir(env: Record<string, string | undefined> = process.env): string {
  if (env.WEBGEN_FILMS_DIR) return env.WEBGEN_FILMS_DIR;
  if (env.WEBGEN_RUNNERS_DIR) return join(homedir(), ".webgen-motion", "fiches");
  return join(process.cwd(), "films");
}

/**
 * Toutes les erreurs d'une fiche. La bibliothèque et le cinéma se valident
 * ici aussi : une fiche qui en a un mal rempli le dit à l'écran, pas
 * seulement au rendu.
 */
export function erreursDeLaFiche(entree: unknown): string[] {
  const erreurs = erreursDeLaSpec(entree);
  if (erreurs.length === 0) erreurs.push(...erreursDeLaBibliotheque(entree), ...erreursDuCinema(entree));
  return erreurs;
}

function lireFiche(id: string, chemin: string): FicheDeFilm {
  let brut: string;
  try {
    brut = readFileSync(chemin, "utf-8");
  } catch (erreur) {
    return { id, etat: "invalide", erreurs: [`fiche illisible : ${(erreur as Error).message}`] };
  }
  let entree: unknown;
  try {
    entree = JSON.parse(brut);
  } catch (erreur) {
    return { id, etat: "invalide", erreurs: [`JSON invalide : ${(erreur as Error).message}`] };
  }
  const erreurs = erreursDeLaFiche(entree);
  if (erreurs.length > 0) return { id, etat: "invalide", erreurs };
  return { id, etat: "valide", spec: entree as FilmSpec };
}

/**
 * Toutes les fiches de `dossier`, triées par id. Dossier absent = aucun film.
 * Un fichier dont le nom n'est pas un id sûr est signalé, pas ignoré.
 */
export function listerFilms(dossier: string = getFilmsDir()): FicheDeFilm[] {
  if (!existsSync(dossier)) return [];
  const fiches: FicheDeFilm[] = [];
  for (const fichier of readdirSync(dossier).sort()) {
    if (!fichier.endsWith(".json")) continue;
    const chemin = join(dossier, fichier);
    if (!statSync(chemin).isFile()) continue;
    const id = fichier.replace(/\.json$/, "");
    if (!estNomSur(id)) {
      fiches.push({ id, etat: "invalide", erreurs: ["nom de fichier : lettres, chiffres, _ et - seulement"] });
      continue;
    }
    fiches.push(lireFiche(id, chemin));
  }
  return fiches;
}

/** La fiche `id`, ou `null` si elle n'existe pas (ou si l'id n'est pas sûr). */
export function chargerFilm(id: string, dossier: string = getFilmsDir()): FicheDeFilm | null {
  if (!estNomSur(id)) return null;
  const chemin = join(dossier, `${id}.json`);
  if (!existsSync(chemin)) return null;
  return lireFiche(id, chemin);
}
