import { ELEMENTS_MAX, EPISODES_A_VENIR_MAX, LONGUEUR_MAX_DE_LA_NOTE_A_VENIR, LONGUEUR_MAX_DU_TITRE_A_VENIR, PERSONNAGES_MAX } from "../../../../remotion/film/cinema/validerCinema";
import type { CinemaDuFilm, ElementDeLaBible, EpisodeAVenir, Personnage, TypeDElement } from "../../../../remotion/film/cinema/types";
import { LONGUEUR_MAX_DE_DESCRIPTION } from "../../../../remotion/film/cinema/validerReferences";
import { idDe } from "../scenario-lecture";

/**
 * Transformer la réponse de Claude (personnages, éléments, épisodes trouvés
 * dans un texte collé) en PROPOSITION : les ids sont posés ici (comme pour
 * un épisode écrit par Claude), ce qui existe déjà sous le même nom est
 * écarté plutôt que dupliqué, et rien ne peut dépasser les plafonds de la
 * série (sinon « Garder » rendrait la fiche invalide). Module pur. Rien
 * n'est appliqué : l'écran montre la proposition, la personne la garde ou non.
 */
type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v);
const texte = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const TYPES_D_ELEMENT: readonly TypeDElement[] = ["creature", "objet", "decor"];

// Comparaison des noms : sans accent ni casse, pour que « Léa » et « LEA »
// (ou « lea ») se reconnaissent comme la même personne. \p{Mn} = les marques
// combinantes (accents) qu'une forme NFD sépare de la lettre de base.
// Exporté : appliquer.ts refait la même comparaison au clic sur « Garder »
// (la série a pu bouger entre-temps).
export const normalise = (nom: string): string => nom.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");

export type PropositionImportee = { personnages: Personnage[]; elements: ElementDeLaBible[]; episodes: EpisodeAVenir[] };
export type LectureDeLImport = { ok: true; proposition: PropositionImportee } | { ok: false; raison: string };

export function lireLImportDeLaBible(cinema: CinemaDuFilm, reponse: unknown): LectureDeLImport {
  if (!estObjet(reponse)) return { ok: false, raison: "La réponse de Claude n'était pas lisible : relance." };

  const idsPris = new Set([...cinema.personnages.map((p) => p.id), ...(cinema.elements ?? []).map((e) => e.id)]);
  // Les noms DÉJÀ dans la série (fixe) : une référence trouvée deux fois dans
  // le texte collé reste gardée deux fois (ids distincts), seule une
  // référence qui existe déjà avant l'import est écartée.
  const nomsDeja = new Set([...cinema.personnages.map((p) => normalise(p.nom)), ...(cinema.elements ?? []).map((e) => normalise(e.nom))]);
  // Les titres déjà écrits OU déjà en attente : un réimport de la même bible
  // ne double pas la liste, et un épisode déjà écrit n'y revient pas.
  const titresDeja = new Set([...cinema.episodes.map((e) => normalise(e.titre)), ...(cinema.episodesAVenir ?? []).map((e) => normalise(e.titre))]);

  const placePersonnages = Math.max(0, PERSONNAGES_MAX - cinema.personnages.length);
  const placeElements = Math.max(0, ELEMENTS_MAX - (cinema.elements ?? []).length);
  const placeEpisodes = Math.max(0, EPISODES_A_VENIR_MAX - (cinema.episodesAVenir ?? []).length);

  const personnages: Personnage[] = [];
  for (const brut of liste(reponse.personnages).filter(estObjet)) {
    if (personnages.length >= placePersonnages) break;
    const nom = texte(brut.nom);
    const description = texte(brut.description);
    if (!nom || !description || nomsDeja.has(normalise(nom))) continue;
    personnages.push({ id: idDe(nom, idsPris), nom, description: description.slice(0, LONGUEUR_MAX_DE_DESCRIPTION) });
  }

  const elements: ElementDeLaBible[] = [];
  for (const brut of liste(reponse.elements).filter(estObjet)) {
    if (elements.length >= placeElements) break;
    const nom = texte(brut.nom);
    const description = texte(brut.description);
    const type = TYPES_D_ELEMENT.find((candidat) => candidat === brut.type);
    if (!nom || !description || !type || nomsDeja.has(normalise(nom))) continue;
    elements.push({ id: idDe(nom, idsPris), type, nom, description: description.slice(0, LONGUEUR_MAX_DE_DESCRIPTION) });
  }

  const episodes: EpisodeAVenir[] = [];
  for (const brut of liste(reponse.episodes).filter(estObjet)) {
    if (episodes.length >= placeEpisodes) break;
    const titre = texte(brut.titre);
    const note = texte(brut.note);
    if (!titre || !note || titresDeja.has(normalise(titre))) continue;
    titresDeja.add(normalise(titre));
    episodes.push({ titre: titre.slice(0, LONGUEUR_MAX_DU_TITRE_A_VENIR), note: note.slice(0, LONGUEUR_MAX_DE_LA_NOTE_A_VENIR) });
  }

  if (personnages.length === 0 && elements.length === 0 && episodes.length === 0) {
    return { ok: false, raison: "Claude n'a rien trouvé d'exploitable dans ce texte : vérifie qu'il décrit bien des personnages ou des épisodes." };
  }
  return { ok: true, proposition: { personnages, elements, episodes } };
}
