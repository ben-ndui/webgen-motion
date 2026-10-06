import { existsSync, statSync } from "node:fs";

import type { DeclinaisonDuFilm, FilmSpec, Langue, MarqueDuFilm } from "../../remotion/film/spec";
import type { FicheDeFilm } from "./film-loader";
import { type EtatDesMedias, etatDesMedias, problemesDeMedias } from "./film-medias";
import { fichiersDuRendu, getFilmOutDir, getFilmPublicDir, urlDuRendu } from "./film-store";

/**
 * L'état d'un film, tiré du DISQUE (fiche + médias + rendus), pour le hub et
 * la page `/film/[id]`. Serveur seulement. Le résultat est sérialisable : il
 * passe tel quel en props à un client component.
 */

// Un mp4 sous ce poids n'est pas une vidéo (même contrat que la route compose).
export const POIDS_MINIMUM_D_UN_RENDU = 1000;

export type StatutDuFilm = "brouillon" | "medias-manquants" | "pret" | "rendu";

export type RenduExistant = { url: string; octets: number; modifieLe: number };

export type EtatDeDeclinaison = DeclinaisonDuFilm & {
  // Vide = rendable. Sinon : chaque média manquant avec son chemin attendu.
  problemes: string[];
  rendu: RenduExistant | null;
};

export type ResumeDuFilm = {
  id: string;
  nom: string;
  statut: StatutDuFilm;
  // Fiche invalide : la liste complète de `erreursDeLaSpec`.
  erreurs: string[];
  exemple: boolean;
  langues: Langue[];
  declinaisons: EtatDeDeclinaison[];
  rendus: number;
  medias: EtatDesMedias | null;
  // Fiche valide seulement : de quoi résumer la marque à l'écran.
  marque: MarqueDuFilm | null;
  musique: { titre: string; tempo: number } | null;
};

export type DossiersDuFilm = { public: string; sortie: string };

export function dossiersDuFilm(id: string): DossiersDuFilm {
  return { public: getFilmPublicDir(id), sortie: getFilmOutDir(id) };
}

function nomDuFilm(spec: FilmSpec, id: string): string {
  const logo = spec.marque.logo;
  return logo.type === "motSymbole" ? logo.texte : logo.logotype || id;
}

function renduExistant(id: string, nom: string, sortie: string): RenduExistant | null {
  const chemin = fichiersDuRendu(sortie, nom).livrable;
  if (!existsSync(chemin)) return null;
  const infos = statSync(chemin);
  if (!infos.isFile() || infos.size < POIDS_MINIMUM_D_UN_RENDU) return null;
  return { url: urlDuRendu(id, nom, Math.round(infos.mtimeMs)), octets: infos.size, modifieLe: infos.mtimeMs };
}

export const MESSAGE_FICHE_D_EXEMPLE = "fiche encore marquée « exemple: true » : la remplir, puis passer à false";

/** Tout ce qui empêche de rendre une déclinaison ; vide = rendable. */
export function problemesDeLaDeclinaison(spec: FilmSpec, medias: EtatDesMedias, langue: Langue): string[] {
  const problemes = spec.exemple ? [MESSAGE_FICHE_D_EXEMPLE] : [];
  return [...problemes, ...problemesDeMedias(medias, langue)];
}

function statutDe(spec: FilmSpec, declinaisons: EtatDeDeclinaison[], rendus: number): StatutDuFilm {
  if (spec.exemple) return "brouillon";
  if (rendus > 0) return "rendu";
  if (declinaisons.some((declinaison) => declinaison.problemes.length > 0)) return "medias-manquants";
  return "pret";
}

export function resumerFilm(fiche: FicheDeFilm, dossiers: DossiersDuFilm = dossiersDuFilm(fiche.id)): ResumeDuFilm {
  if (fiche.etat === "invalide") {
    return {
      id: fiche.id,
      nom: fiche.id,
      statut: "brouillon",
      erreurs: fiche.erreurs,
      exemple: false,
      langues: [],
      declinaisons: [],
      rendus: 0,
      medias: null,
      marque: null,
      musique: null,
    };
  }
  const { spec } = fiche;
  const langues = [...new Set(spec.declinaisons.map((declinaison) => declinaison.langue))];
  const medias = etatDesMedias(spec, dossiers.public, langues);
  const declinaisons = spec.declinaisons.map((declinaison) => ({
    ...declinaison,
    problemes: problemesDeLaDeclinaison(spec, medias, declinaison.langue),
    rendu: renduExistant(fiche.id, declinaison.nom, dossiers.sortie),
  }));
  const rendus = declinaisons.filter((declinaison) => declinaison.rendu !== null).length;
  return {
    id: fiche.id,
    nom: nomDuFilm(spec, fiche.id),
    statut: statutDe(spec, declinaisons, rendus),
    erreurs: [],
    exemple: spec.exemple,
    langues,
    declinaisons,
    rendus,
    medias,
    marque: spec.marque,
    musique: { titre: spec.musique.titre, tempo: spec.musique.tempo },
  };
}
