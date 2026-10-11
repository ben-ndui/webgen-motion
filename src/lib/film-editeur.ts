import { lireFicheBrute } from "./film-ecriture";
import { languesDuFilm, textesEncoreExemple } from "./film-fiche-depart";
import { erreursDeLaFiche, getFilmsDir } from "./film-loader";
import { type MediaAttendu, etatDesMedias } from "./film-medias";
import { getFilmDir, getFilmPublicDir } from "./film-store";
import { lirePropositions } from "./site/propositions-store";
import type { FilmSpec, Langue } from "../../remotion/film/spec";

/**
 * Tout ce que l'assistant de création affiche, en une lecture du disque :
 * la fiche, ses erreurs, les médias attendus (présents ou non) et les
 * textes encore à écrire. Sérialisable : passe tel quel au client.
 * SERVEUR SEULEMENT.
 */
export type MediaDeLEditeur = Pick<MediaAttendu, "role" | "relatif" | "present" | "langues">;

export type EtatDeLEditeur = {
  id: string;
  fiche: FilmSpec;
  // Fiche valide seulement : sinon les médias attendus ne se calculent pas.
  valide: boolean;
  erreurs: string[];
  medias: MediaDeLEditeur[];
  textesAEcrire: { langue: Langue; champ: string }[];
  // Deux captures identiques dans une suite qui doit bouger : le rendu les refuse.
  doublons: string[];
  // Ce que GEN MOTION a proposé depuis le site (clé « fr:bascule.constat »…).
  propositions: Record<string, string>;
};

export function etatDeLEditeur(
  id: string,
  dossiers: { fiches: string; public: (id: string) => string; film?: (id: string) => string } = { fiches: getFilmsDir(), public: getFilmPublicDir },
): EtatDeLEditeur | null {
  const brute = lireFicheBrute(id, dossiers.fiches);
  if (!brute) return null;
  const erreurs = erreursDeLaFiche(brute);
  const fiche = brute as FilmSpec;
  const propositions = lirePropositions(id, dossiers.film ?? getFilmDir);
  if (erreurs.length > 0) {
    return { id, fiche, valide: false, erreurs, medias: [], textesAEcrire: [], doublons: [], propositions };
  }
  const etat = etatDesMedias(fiche, dossiers.public(id), languesDuFilm(fiche));
  const medias = etat.medias.map(({ role, relatif, present, langues }) => ({ role, relatif, present, langues }));
  const doublons = etat.doublons.map((doublon) => doublon.message);
  return { id, fiche, valide: true, erreurs, medias, textesAEcrire: textesEncoreExemple(fiche), doublons, propositions };
}
