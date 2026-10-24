import { estUnExemple } from "../../../../remotion/film/cinema/exemples";
import type { CinemaDuFilm, EpisodeDeCinema, PlanDeCinema } from "../../../../remotion/film/cinema/types";
import { ELEMENTS_MAX, EPISODES_A_VENIR_MAX, PERSONNAGES_MAX } from "../../../../remotion/film/cinema/validerCinema";
import { ajouterUnPlan } from "../edition-serie";
import { normalise } from "./import-bible";
import type { Proposition } from "./types";

/**
 * Poser une proposition GARDÉE sur la série, telle qu'elle est au moment du
 * clic (la personne a pu continuer d'éditer pendant que Claude écrivait).
 * Module pur, appelé par l'écran dans `modifierLaSerie`. Rend la raison si la
 * proposition ne tient plus (plan retiré, personnage sorti du plan).
 */
const tousLesPlans = (cinema: CinemaDuFilm) => cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans));
const laScene = (cinema: CinemaDuFilm, id: string) => cinema.episodes.flatMap((e) => e.scenes).find((s) => s.id === id);

function numeroLibre(ids: string[], prefixe: string): number {
  return Math.max(0, ...ids.map((id) => Number(id.replace(prefixe, ""))).filter(Number.isFinite)) + 1;
}

// L'épisode a été numéroté contre la série d'AVANT : on lui redonne des ids
// libres dans la série d'aujourd'hui, pour n'écraser aucun plan.
function renumeroter(cinema: CinemaDuFilm, episode: EpisodeDeCinema): EpisodeDeCinema {
  let plan = numeroLibre(tousLesPlans(cinema).map((p) => p.id), "plan-");
  let scene = numeroLibre(cinema.episodes.flatMap((e) => e.scenes.map((s) => s.id)), "scene-");
  return {
    id: `ep${numeroLibre(cinema.episodes.map((e) => e.id), "ep")}`,
    titre: episode.titre,
    scenes: episode.scenes.map((s) => ({ ...s, id: `scene-${scene++}`, plans: s.plans.map((p) => ({ ...p, id: `plan-${plan++}` })) })),
  };
}

function parleALImage(plan: PlanDeCinema, personnage: string): boolean {
  return plan.personnages.includes(personnage);
}

export function appliquerLaProposition(cinema: CinemaDuFilm, proposition: Proposition): string | null {
  switch (proposition.type) {
    case "replique": {
      const plan = tousLesPlans(cinema).find((p) => p.id === proposition.plan);
      if (!plan) return "Ce plan a été retiré entre-temps.";
      if (!parleALImage(plan, proposition.replique.personnage)) return "Ce personnage n'est plus à l'image dans ce plan : redemande.";
      plan.replique = proposition.replique;
      return null;
    }
    case "consigne": {
      const plan = tousLesPlans(cinema).find((p) => p.id === proposition.plan);
      if (!plan) return "Ce plan a été retiré entre-temps.";
      plan.consigne = proposition.consigne;
      return null;
    }
    case "dialogues": {
      const scene = laScene(cinema, proposition.scene);
      if (!scene) return "Cette scène a été retirée entre-temps.";
      for (const plan of scene.plans) {
        if (!(plan.id in proposition.repliques)) continue;
        const replique = proposition.repliques[plan.id];
        if (replique && !parleALImage(plan, replique.personnage)) return "Un personnage n'est plus à l'image : redemande les dialogues.";
      }
      for (const plan of scene.plans) {
        if (!(plan.id in proposition.repliques)) continue;
        const replique = proposition.repliques[plan.id];
        if (replique) plan.replique = replique;
        else delete plan.replique;
      }
      return null;
    }
    case "plan-suivant": {
      const scene = laScene(cinema, proposition.scene);
      if (!scene) return "Cette scène a été retirée entre-temps.";
      ajouterUnPlan(cinema, scene.id);
      const ajoute = scene.plans.at(-1)!;
      Object.assign(ajoute, proposition.plan);
      return null;
    }
    case "episode-suivant": {
      const connus = new Set(cinema.personnages.map((p) => p.id));
      cinema.personnages.push(...proposition.nouveauxPersonnages.filter((p) => !connus.has(p.id)));
      cinema.episodes.push(renumeroter(cinema, proposition.episode));
      return null;
    }
    case "importer-bible": {
      // Reconfirmé ici : la série a pu bouger entre la réponse de Claude et le
      // clic sur « Garder » (renommage, ajout à la main, autre import) : id,
      // nom (sans accent ni casse) ET plafonds sont revérifiés, pas seulement l'id.
      const idsConnus = new Set([...cinema.personnages.map((p) => p.id), ...(cinema.elements ?? []).map((e) => e.id)]);
      const nomsConnus = new Set([...cinema.personnages.map((p) => normalise(p.nom)), ...(cinema.elements ?? []).map((e) => normalise(e.nom))]);
      // L'épisode d'exemple (« Épisode 1 ») d'une série tout juste créée ne
      // doit pas écarter le vrai premier épisode d'une bible importée.
      const titresConnus = new Set([
        ...cinema.episodes.filter((e) => !estUnExemple("titre", e.titre)).map((e) => normalise(e.titre)),
        ...(cinema.episodesAVenir ?? []).map((e) => normalise(e.titre)),
      ]);

      const placePersonnages = Math.max(0, PERSONNAGES_MAX - cinema.personnages.length);
      const nouveauxPersonnages = proposition.personnages.filter((p) => !idsConnus.has(p.id) && !nomsConnus.has(normalise(p.nom))).slice(0, placePersonnages);
      cinema.personnages.push(...nouveauxPersonnages);

      const placeElements = Math.max(0, ELEMENTS_MAX - (cinema.elements ?? []).length);
      const nouveauxElements = proposition.elements.filter((e) => !idsConnus.has(e.id) && !nomsConnus.has(normalise(e.nom))).slice(0, placeElements);
      cinema.elements = [...(cinema.elements ?? []), ...nouveauxElements];

      const placeEpisodes = Math.max(0, EPISODES_A_VENIR_MAX - (cinema.episodesAVenir ?? []).length);
      const nouveauxEpisodes = proposition.episodes.filter((e) => !titresConnus.has(normalise(e.titre))).slice(0, placeEpisodes);
      cinema.episodesAVenir = [...(cinema.episodesAVenir ?? []), ...nouveauxEpisodes];
      return null;
    }
    case "decrire-reference": {
      const personnage = cinema.personnages.find((p) => p.id === proposition.reference);
      const element = (cinema.elements ?? []).find((e) => e.id === proposition.reference);
      if (!personnage && !element) return "Cette référence a été retirée entre-temps.";
      (personnage ?? element!).description = proposition.description;
      return null;
    }
  }
}
