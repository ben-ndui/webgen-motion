import { existsSync, statSync } from "node:fs";

import { DIRECTION_PAR_DEFAUT } from "../../remotion/film/marque/direction";
import type { DeclinaisonDuFilm, DirectionDuFilm, FilmSpec, Langue, MarqueDuFilm } from "../../remotion/film/spec";
import type { FicheDeFilm } from "./film-loader";
import { reperesMontes } from "./film-voix-plans";
import { problemesDeLEpisode } from "./cinema/pret-a-rendre";
import { type EtatDesMedias, etatDesMedias, problemesDeMedias } from "./film-medias";
import { type TypeDeRendu, fichiersDuRendu, getFilmOutDir, getFilmPublicDir, urlDuRendu } from "./film-store";

/**
 * L'état d'un film, tiré du DISQUE (fiche + médias + rendus), pour le hub et
 * la page `/film/[id]`. Serveur seulement. Le résultat est sérialisable : il
 * passe tel quel en props à un client component.
 */

// Un mp4 sous ce poids n'est pas une vidéo (même contrat que la route compose).
export const POIDS_MINIMUM_D_UN_RENDU = 1000;

export type StatutDuFilm = "brouillon" | "medias-manquants" | "pret" | "rendu";

export type RenduExistant = { url: string; octets: number; modifieLe: number };

export type EtatDuRenduSurDisque = {
  // Vide = rendable. Sinon : chaque média manquant avec son chemin attendu.
  problemes: string[];
  rendu: RenduExistant | null;
};

export type EtatDUnEpisode = EtatDuRenduSurDisque & { id: string; titre: string };

export type EtatDeDeclinaison = DeclinaisonDuFilm &
  EtatDuRenduSurDisque & {
    // Le rendu de la bibliothèque de plans ; null quand la fiche n'en a pas.
    bibliotheque: EtatDuRenduSurDisque | null;
    // Les épisodes de la série dans la langue de cette déclinaison. Un épisode
    // est toujours vertical : une seule déclinaison par langue les porte
    // (la première courte), les autres ont une liste vide.
    episodes: EtatDUnEpisode[];
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
  // Fiche sans `direction` : celle par défaut, « marque ».
  direction: DirectionDuFilm | null;
};

export type DossiersDuFilm = { public: string; sortie: string };

export function dossiersDuFilm(id: string): DossiersDuFilm {
  return { public: getFilmPublicDir(id), sortie: getFilmOutDir(id) };
}

function nomDuFilm(spec: FilmSpec, id: string): string {
  if (spec.marque.nom?.trim()) return spec.marque.nom.trim();
  const logo = spec.marque.logo;
  if (logo.type === "motSymbole") return logo.texte;
  if (logo.type === "glyphe") return logo.logotype || id;
  // Un logo fourni en image n'a pas de nom écrit : l'id de la fiche le remplace.
  return id;
}

function renduExistant(id: string, nom: string, sortie: string, type: TypeDeRendu, episode?: string): RenduExistant | null {
  const chemin = fichiersDuRendu(sortie, nom, type, episode).livrable;
  if (!existsSync(chemin)) return null;
  const infos = statSync(chemin);
  if (!infos.isFile() || infos.size < POIDS_MINIMUM_D_UN_RENDU) return null;
  return { url: urlDuRendu(id, nom, Math.round(infos.mtimeMs), type, episode), octets: infos.size, modifieLe: infos.mtimeMs };
}

export const MESSAGE_FICHE_D_EXEMPLE = "fiche encore marquée « exemple: true » : la remplir, puis passer à false";

export const MESSAGE_SANS_BIBLIOTHEQUE = "la fiche n'a pas de « bibliotheque » : aucun plan de bibliothèque à rendre";

/** Tout ce qui empêche un rendu d'une déclinaison ; vide = rendable. */
export function problemesDeLaDeclinaison(
  spec: FilmSpec,
  medias: EtatDesMedias,
  langue: Langue,
  type: TypeDeRendu = "film",
  episode?: string,
): string[] {
  if (type === "bibliotheque" && !spec.bibliotheque) return [MESSAGE_SANS_BIBLIOTHEQUE];
  // Les textes de la marque ne servent à un épisode que s'il finit sur le logo
  // de la marque (sa signature) : une série autonome ne les exige pas.
  const finSurLaMarque = (spec.cinema?.fin?.type ?? "logo-de-la-marque") === "logo-de-la-marque";
  const exigeLesTextes = type !== "episode" || finSurLaMarque;
  const problemes = spec.exemple && exigeLesTextes ? [MESSAGE_FICHE_D_EXEMPLE] : [];
  if (type === "episode") problemes.push(...problemesDeLEpisode(spec, episode, medias.dossierPublic));
  // Une voix écrite mais pas générée ne serait pas jouée : le film sortirait
  // muet là où la personne attend sa phrase.
  if (type === "film") {
    const montes = new Set(reperesMontes(spec, langue).map((r) => r.cle));
    for (const ligne of spec.voix?.lignes[langue] ?? []) {
      if (!ligne.fichier && montes.has(ligne.repere)) problemes.push(`voix off à générer : « ${ligne.repere} »`);
    }
  }
  return [...problemes, ...problemesDeMedias(medias, langue, type)];
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
      direction: null,
    };
  }
  const { spec } = fiche;
  const langues = [...new Set(spec.declinaisons.map((declinaison) => declinaison.langue))];
  const medias = etatDesMedias(spec, dossiers.public, langues);
  // La déclinaison qui porte les épisodes de chaque langue : la première courte, sinon la première.
  const porteuses = new Set(
    langues.map((langue) => (spec.declinaisons.find((d) => d.langue === langue && d.version === "court") ?? spec.declinaisons.find((d) => d.langue === langue))?.nom),
  );
  const declinaisons = spec.declinaisons.map((declinaison) => ({
    ...declinaison,
    problemes: problemesDeLaDeclinaison(spec, medias, declinaison.langue),
    rendu: renduExistant(fiche.id, declinaison.nom, dossiers.sortie, "film"),
    bibliotheque: spec.bibliotheque
      ? {
          problemes: problemesDeLaDeclinaison(spec, medias, declinaison.langue, "bibliotheque"),
          rendu: renduExistant(fiche.id, declinaison.nom, dossiers.sortie, "bibliotheque"),
        }
      : null,
    episodes: porteuses.has(declinaison.nom)
      ? (spec.cinema?.episodes ?? []).map((episode) => ({
          id: episode.id,
          titre: episode.titre,
          problemes: problemesDeLaDeclinaison(spec, medias, declinaison.langue, "episode", episode.id),
          rendu: renduExistant(fiche.id, declinaison.nom, dossiers.sortie, "episode", episode.id),
        }))
      : [],
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
    direction: spec.direction ?? DIRECTION_PAR_DEFAUT,
  };
}
