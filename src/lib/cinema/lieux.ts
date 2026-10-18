import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { resolveFalKey, resolveVeoKey } from "../config-resolve";
import { chargerFilm, getFilmsDir } from "../film-loader";
import { getFilmDir, getFilmPublicDir } from "../film-store";
import { API_FAL, DOMAINES_FAL_PAR_DEFAUT, type ClientFal } from "./seedance";
import { API_VEO, type ClientVeo } from "./veo";

/**
 * Où le cinéma lit et écrit, et la lecture commune de la fiche. Les tests
 * remplacent ces lieux par des dossiers jetables et un faux Google local.
 */
export type Lieux = {
  fiches: string;
  dossier: (id: string) => string;
  public: (id: string) => string;
  // Le client Google (réel par défaut ; un faux Google local dans les tests).
  veo: () => ClientVeo | null;
  // Le client fal.ai / Seedance (réel par défaut ; un faux serveur local dans les tests).
  fal: () => ClientFal | null;
};

export const LIEUX_PAR_DEFAUT: Lieux = {
  fiches: getFilmsDir(),
  dossier: getFilmDir,
  public: getFilmPublicDir,
  veo: () => {
    const cle = resolveVeoKey();
    return cle ? { base: API_VEO, cle } : null;
  },
  fal: () => {
    const cle = resolveFalKey();
    return cle ? { base: API_FAL, cle, domainesMedia: DOMAINES_FAL_PAR_DEFAUT } : null;
  },
};

export type Refus = { ok: false; statut: 400 | 404 | 409 | 412 | 502; raison: string };

export const SANS_CLE: Refus = { ok: false, statut: 412, raison: "Aucune clé Gemini : ajoute-la dans les Réglages pour générer." };
export const SANS_CLE_FAL: Refus = { ok: false, statut: 412, raison: "Aucune clé fal.ai : ajoute-la dans les Réglages pour générer avec Seedance." };

/** La fiche du film, valide et avec un cinéma ; sinon le refus qui dit pourquoi. */
export function ficheAvecCinema(id: string, lieux: Lieux): { ok: true; spec: FilmSpec; cinema: CinemaDuFilm } | Refus {
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };
  const cinema = fiche.spec.cinema;
  if (!cinema) return { ok: false, statut: 400, raison: "Ce film n'a pas encore de série." };
  return { ok: true, spec: fiche.spec, cinema };
}
