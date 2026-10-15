import { estUnExemple } from "../../../../remotion/film/cinema/exemples";
import type { CinemaDuFilm, EpisodeDeCinema, PlanDeCinema } from "../../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../../remotion/film/spec";
import { paletteEnMots } from "../couleurs";

/**
 * Ce que Claude sait de la série à chaque demande : la marque, le casting,
 * le produit et l'épisode entier, plan par plan. Module pur. Un texte
 * d'exemple (plan tout juste ajouté) est montré comme VIDE : Claude doit
 * l'écrire, pas le reprendre.
 */
export type MarqueDuFilm = Pick<FilmSpec, "marque" | "direction">;

const VIDE = "(empty: to be written)";

export function nomDuPersonnage(cinema: CinemaDuFilm, id: string): string {
  return cinema.personnages.find((p) => p.id === id)?.nom ?? id;
}

export function ligneDeLaMarque({ marque, direction }: MarqueDuFilm): string {
  const { encre, accent, clair } = marque.couleurs;
  return `Brand: ${marque.nom ?? "(no name given)"}. Colors: ${paletteEnMots([encre, accent, clair])}. Mood: ${direction ?? "marque"}.`;
}

export function leCasting(cinema: CinemaDuFilm): string {
  if (cinema.personnages.length === 0) return "No characters yet.";
  return `Characters:\n${cinema.personnages.map((p) => `- ${p.nom}: ${estUnExemple("description", p.description) ? VIDE : p.description}`).join("\n")}`;
}

export function leProduit(cinema: CinemaDuFilm): string {
  return cinema.objet ? `The product (never name the brand in the image): ${cinema.objet}` : "No product described.";
}

function lePlan(cinema: CinemaDuFilm, plan: PlanDeCinema, numero: number, cible: string | undefined): string {
  const marque = plan.id === cible ? "  <== THIS SHOT" : "";
  const presents = plan.personnages.map((id) => nomDuPersonnage(cinema, id));
  const consigne = estUnExemple("consigne", plan.consigne) ? VIDE : plan.consigne;
  const replique = plan.replique ? `${nomDuPersonnage(cinema, plan.replique.personnage)} says (French): "${plan.replique.texte}"` : "no line";
  return [
    `  Shot ${numero}${marque}`,
    `    On screen: ${presents.length > 0 ? presents.join(", ") : "nobody"}${plan.objet ? " + the product" : ""}`,
    `    Action: ${consigne}`,
    `    Dialogue: ${replique}`,
  ].join("\n");
}

/** L'épisode entier, la scène et le plan visés repérés. */
export function lEpisode(cinema: CinemaDuFilm, episode: EpisodeDeCinema, cible: { scene?: string; plan?: string } = {}): string {
  const titre = estUnExemple("titre", episode.titre) ? VIDE : episode.titre;
  const scenes = episode.scenes.map((scene, index) => {
    const marque = scene.id === cible.scene ? "  <== THIS SCENE" : "";
    const decor = estUnExemple("decor", scene.decor) ? VIDE : scene.decor;
    const plans = scene.plans.map((plan, i) => lePlan(cinema, plan, i + 1, cible.plan)).join("\n");
    return `Scene ${index + 1}${marque} — setting: ${decor}\n${plans}`;
  });
  return `Episode "${titre}"\n${scenes.join("\n")}`;
}

/** Les épisodes déjà écrits, en résumé : pour écrire la suite sans se répéter. */
export function lesEpisodesPrecedents(cinema: CinemaDuFilm): string {
  if (cinema.episodes.length === 0) return "No episode yet.";
  return cinema.episodes.map((episode) => lEpisode(cinema, episode)).join("\n\n");
}
