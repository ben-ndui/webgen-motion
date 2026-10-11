import { lireFicheBrute } from "./film-ecriture";
import { languesDuFilm, textesEncoreExemple } from "./film-fiche-depart";
import { erreursDeLaFiche, getFilmsDir } from "./film-loader";
import { type MediaAttendu, etatDesMedias } from "./film-medias";
import { getFilmPublicDir } from "./film-store";
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
};

export function etatDeLEditeur(
  id: string,
  dossiers: { fiches: string; public: (id: string) => string } = { fiches: getFilmsDir(), public: getFilmPublicDir },
): EtatDeLEditeur | null {
  const brute = lireFicheBrute(id, dossiers.fiches);
  if (!brute) return null;
  const erreurs = erreursDeLaFiche(brute);
  const fiche = brute as FilmSpec;
  if (erreurs.length > 0) {
    return { id, fiche, valide: false, erreurs, medias: [], textesAEcrire: [] };
  }
  const medias = etatDesMedias(fiche, dossiers.public(id), languesDuFilm(fiche)).medias.map(
    ({ role, relatif, present, langues }) => ({ role, relatif, present, langues }),
  );
  return { id, fiche, valide: true, erreurs, medias, textesAEcrire: textesEncoreExemple(fiche) };
}
