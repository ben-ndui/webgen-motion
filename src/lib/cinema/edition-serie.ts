import { EXEMPLES_DE_SERIE } from "../../../remotion/film/cinema/exemples";
import { type CinemaDuFilm, DUREE_D_UN_PLAN, type PlanDeCinema, type SceneDeCinema } from "../../../remotion/film/cinema/types";

/**
 * Les gestes d'édition de la série, sur une COPIE de la fiche (l'assistant
 * les passe à `modifier`). Chaque geste laisse la série valide : un nouvel
 * élément part avec les textes d'exemple, et un id libre dans tout le film.
 * Sans accès disque : l'écran les importe.
 */
function prochainNumero(ids: string[], prefixe: string): number {
  const numeros = ids.map((id) => Number(id.replace(prefixe, ""))).filter(Number.isFinite);
  return Math.max(0, ...numeros) + 1;
}

const tousLesPlans = (cinema: CinemaDuFilm) => cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans));
const toutesLesScenes = (cinema: CinemaDuFilm) => cinema.episodes.flatMap((e) => e.scenes);

function nouveauPlan(cinema: CinemaDuFilm): PlanDeCinema {
  const numero = prochainNumero(tousLesPlans(cinema).map((p) => p.id), "plan-");
  return { id: `plan-${numero}`, consigne: EXEMPLES_DE_SERIE.consigne, personnages: [], objet: false };
}

function nouvelleScene(cinema: CinemaDuFilm): SceneDeCinema {
  const numero = prochainNumero(toutesLesScenes(cinema).map((s) => s.id), "scene-");
  return { id: `scene-${numero}`, decor: EXEMPLES_DE_SERIE.decor, plans: [nouveauPlan(cinema)] };
}

export function serieDeDepart(): CinemaDuFilm {
  const vide: CinemaDuFilm = { personnages: [], episodes: [] };
  return { ...vide, episodes: [{ id: "ep1", titre: EXEMPLES_DE_SERIE.titre, scenes: [nouvelleScene(vide)] }] };
}

export function ajouterUnEpisode(cinema: CinemaDuFilm): string {
  const numero = prochainNumero(cinema.episodes.map((e) => e.id), "ep");
  const id = `ep${numero}`;
  // La scène est créée AVANT d'ajouter l'épisode : son plan prend un id libre.
  const scene = nouvelleScene(cinema);
  cinema.episodes.push({ id, titre: `Épisode ${numero}`, scenes: [scene] });
  return id;
}

export function ajouterUnPersonnage(cinema: CinemaDuFilm): void {
  const numero = prochainNumero(cinema.personnages.map((p) => p.id), "personnage-");
  cinema.personnages.push({ id: `personnage-${numero}`, nom: `Personnage ${numero}`, description: EXEMPLES_DE_SERIE.description });
}

/** Retire le personnage ET tout ce qui le cite : sinon la fiche deviendrait invalide. */
export function retirerUnPersonnage(cinema: CinemaDuFilm, personnageId: string): void {
  cinema.personnages = cinema.personnages.filter((p) => p.id !== personnageId);
  for (const plan of tousLesPlans(cinema)) {
    plan.personnages = plan.personnages.filter((id) => id !== personnageId);
    if (plan.replique?.personnage === personnageId) delete plan.replique;
  }
}

export function ajouterUneScene(cinema: CinemaDuFilm, episodeId: string): void {
  const episode = cinema.episodes.find((e) => e.id === episodeId);
  if (episode) episode.scenes.push(nouvelleScene(cinema));
}

export function ajouterUnPlan(cinema: CinemaDuFilm, sceneId: string): void {
  const scene = toutesLesScenes(cinema).find((s) => s.id === sceneId);
  if (scene) scene.plans.push(nouveauPlan(cinema));
}

/** Retire un plan ; une scène vidée disparaît, un épisode vidé aussi (mais jamais le dernier). */
export function retirerUnPlan(cinema: CinemaDuFilm, planId: string): void {
  for (const episode of cinema.episodes) {
    for (const scene of episode.scenes) scene.plans = scene.plans.filter((p) => p.id !== planId);
    episode.scenes = episode.scenes.filter((s) => s.plans.length > 0);
  }
  const restants = cinema.episodes.filter((e) => e.scenes.length > 0);
  cinema.episodes = restants.length > 0 ? restants : serieDeDepart().episodes;
}

/** Montre ou retire un personnage d'un plan ; un personnage qui sort ne garde pas sa réplique. */
export function basculerUnPersonnage(plan: PlanDeCinema, personnageId: string): void {
  if (plan.personnages.includes(personnageId)) {
    plan.personnages = plan.personnages.filter((id) => id !== personnageId);
    if (plan.replique?.personnage === personnageId) delete plan.replique;
  } else {
    plan.personnages.push(personnageId);
  }
}

const auDixieme = (secondes: number) => Math.round(secondes * 10) / 10;

/**
 * Pose la découpe d'un plan en la gardant VALIDE : bornes ramenées dans les
 * 8 s, au dixième, au moins une demi-seconde gardée ; une coupe qui ne tient
 * plus dans le morceau gardé tombe. Tout garder = pas de découpe.
 */
export function poserLaDecoupe(plan: PlanDeCinema, voulue: { debut: number; fin: number; coupe?: [number, number] }): void {
  const debut = Math.min(Math.max(0, auDixieme(voulue.debut)), DUREE_D_UN_PLAN - 0.5);
  const fin = Math.max(Math.min(DUREE_D_UN_PLAN, auDixieme(voulue.fin)), debut + 0.5);
  const coupe = voulue.coupe ? ([auDixieme(Math.min(...voulue.coupe)), auDixieme(Math.max(...voulue.coupe))] as [number, number]) : undefined;
  const coupeTient = coupe !== undefined && coupe[0] > debut && coupe[1] < fin && coupe[0] < coupe[1];
  if (debut === 0 && fin === DUREE_D_UN_PLAN && !coupeTient) {
    delete plan.decoupe;
    return;
  }
  plan.decoupe = coupeTient ? { debut, fin, coupe } : { debut, fin };
}
