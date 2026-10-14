import type { FilmSpec } from "../../../remotion/film/spec";
import { LONGUEUR_MAX_DU_BRIEF } from "../cinema/scenario-claude";
import { estLEpisodeDeDepartVierge } from "../cinema/scenario-lecture";
import type { LectureDuSite } from "./lecture-du-site";

/**
 * La série au remplissage depuis le site. Module pur. Règle du remplissage :
 * on ne remplace que ce qui n'a jamais été touché. Une série est « vierge »
 * si elle n'existe pas, ou s'il n'y a que l'épisode d'exemple de « Commencer
 * la série » et aucun personnage.
 */
export function serieVierge(spec: FilmSpec): boolean {
  const cinema = spec.cinema;
  if (!cinema) return true;
  return cinema.personnages.length === 0 && !cinema.objet && cinema.episodes.every(estLEpisodeDeDepartVierge);
}

const NOMBRE_DE_TITRES = 6;
const NOMBRE_DE_PARAGRAPHES = 4;

/** Le brief que le site donne à Claude : qui est la marque et ce qu'elle dit d'elle-même, rien d'inventé. */
export function briefDepuisLeSite(lecture: LectureDuSite): string {
  // La consigne d'abord : si le brief est trop long, c'est le site qu'on coupe, jamais la demande.
  const lignes = [
    "Écris un premier épisode court (3 à 6 plans) qui donne envie de découvrir la marque : un personnage dans un lieu qui lui ressemble, le produit phare à l'image, une ou deux répliques.",
    `Marque : ${lecture.nomDuSite || lecture.titre}.`,
    lecture.description ? `Ce qu'elle dit d'elle : ${lecture.description}` : "",
    lecture.textes.titres.length > 0 ? `Titres de son site : ${lecture.textes.titres.slice(0, NOMBRE_DE_TITRES).join(" / ")}.` : "",
    ...lecture.textes.paragraphes.slice(0, NOMBRE_DE_PARAGRAPHES),
  ];
  const brief = lignes.filter(Boolean).join("\n");
  return brief.length > LONGUEUR_MAX_DU_BRIEF ? brief.slice(0, LONGUEUR_MAX_DU_BRIEF) : brief;
}
