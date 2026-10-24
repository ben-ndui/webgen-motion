import { EXEMPLES_DE_SERIE } from "../../../remotion/film/cinema/exemples";
import { type CinemaDuFilm, DUREE_D_UN_PLAN, type EpisodeDeCinema, type PlanDeCinema, type SceneDeCinema, type TypeDElement } from "../../../remotion/film/cinema/types";
import { idDe } from "./scenario-lecture";

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

/**
 * Un épisode écrit par Claude depuis un brief arrive dans une série COMPLÈTE,
 * reconstruite par le serveur à partir de la fiche du disque au moment de la
 * demande : la série a pu bouger depuis (un import gardé entre-temps, par
 * exemple). On ne remplace donc jamais `cinema` en bloc, qui effacerait ce
 * changement sans un mot : on retrouve l'épisode écrit et les personnages
 * qu'il a créés, pour les fusionner dans la série TELLE QU'ELLE EST
 * MAINTENANT. Les ids de personnages que l'épisode proposé cite sont réécrits
 * au passage (ses ids n'ont de sens que dans SA PROPRE copie de la série).
 * Rend l'id réel du nouvel épisode (jamais celui proposé, toujours renuméroté
 * contre la série actuelle), ou `null` si l'épisode annoncé est introuvable.
 */
export function fusionnerLEpisodeEcrit(cinema: CinemaDuFilm, propose: CinemaDuFilm, episodeId: string): string | null {
  const episode = propose.episodes.find((e) => e.id === episodeId);
  if (!episode) return null;

  // Un personnage déjà connu (même prénom) garde SON id actuel ; un nouveau
  // reçoit un id libre dans la série actuelle, pas celle proposée.
  const idsPris = new Set([...cinema.personnages.map((p) => p.id), ...(cinema.elements ?? []).map((e) => e.id)]);
  const idParPrenomActuel = new Map(cinema.personnages.map((p) => [p.nom.toLowerCase(), p.id]));
  const reecritureDesIds = new Map<string, string>();
  for (const personnage of propose.personnages) {
    const prenom = personnage.nom.toLowerCase();
    const idExistant = idParPrenomActuel.get(prenom);
    if (idExistant) {
      reecritureDesIds.set(personnage.id, idExistant);
      continue;
    }
    const nouvelId = idDe(personnage.nom, idsPris);
    reecritureDesIds.set(personnage.id, nouvelId);
    idParPrenomActuel.set(prenom, nouvelId);
    cinema.personnages.push({ ...personnage, id: nouvelId });
  }
  if (!cinema.objet && propose.objet) cinema.objet = propose.objet;

  let plan = prochainNumero(tousLesPlans(cinema).map((p) => p.id), "plan-");
  let scene = prochainNumero(toutesLesScenes(cinema).map((s) => s.id), "scene-");
  const nouvelId = `ep${prochainNumero(cinema.episodes.map((e) => e.id), "ep")}`;
  const episodeRenumerote: EpisodeDeCinema = {
    id: nouvelId,
    titre: episode.titre,
    scenes: episode.scenes.map((s) => ({
      ...s,
      id: `scene-${scene++}`,
      plans: s.plans.map((p) => {
        const { replique: ancienneReplique, personnages: anciensPersonnages, ...resteDuPlan } = p;
        const nouveauPlan: PlanDeCinema = {
          ...resteDuPlan,
          id: `plan-${plan++}`,
          personnages: anciensPersonnages.map((id) => reecritureDesIds.get(id)).filter((id): id is string => !!id),
        };
        if (ancienneReplique && reecritureDesIds.has(ancienneReplique.personnage)) {
          nouveauPlan.replique = { ...ancienneReplique, personnage: reecritureDesIds.get(ancienneReplique.personnage)! };
        }
        return nouveauPlan;
      }),
    })),
  };
  cinema.episodes.push(episodeRenumerote);
  return nouvelId;
}

export function ajouterUnPersonnage(cinema: CinemaDuFilm): void {
  const numero = prochainNumero(cinema.personnages.map((p) => p.id), "personnage-");
  cinema.personnages.push({ id: `personnage-${numero}`, nom: `Personnage ${numero}`, description: EXEMPLES_DE_SERIE.description });
}

/** Retire l'id de tout ce qui pourrait le citer, pour garder la fiche valide. */
function retirerLaReferencePartout(cinema: CinemaDuFilm, id: string): void {
  for (const plan of tousLesPlans(cinema)) {
    if (plan.references) plan.references = plan.references.filter((r) => r !== id);
  }
}

/** Retire le personnage ET tout ce qui le cite : sinon la fiche deviendrait invalide. */
export function retirerUnPersonnage(cinema: CinemaDuFilm, personnageId: string): void {
  cinema.personnages = cinema.personnages.filter((p) => p.id !== personnageId);
  retirerLaReferencePartout(cinema, personnageId);
  for (const plan of tousLesPlans(cinema)) {
    plan.personnages = plan.personnages.filter((id) => id !== personnageId);
    if (plan.replique?.personnage === personnageId) delete plan.replique;
  }
}

const PREFIXE_DU_TYPE: Record<TypeDElement, string> = { creature: "creature-", objet: "objet-", decor: "decor-" };
const NOM_DU_TYPE_D_ELEMENT: Record<TypeDElement, string> = { creature: "Créature", objet: "Objet", decor: "Décor" };

export function ajouterUnElement(cinema: CinemaDuFilm, type: TypeDElement): void {
  const prefixe = PREFIXE_DU_TYPE[type];
  const numero = prochainNumero((cinema.elements ?? []).map((e) => e.id), prefixe);
  const element = { id: `${prefixe}${numero}`, type, nom: `${NOM_DU_TYPE_D_ELEMENT[type]} ${numero}`, description: EXEMPLES_DE_SERIE.description };
  cinema.elements = [...(cinema.elements ?? []), element];
}

/** Retire l'élément ET tout ce qui le cite : sinon la fiche deviendrait invalide. */
export function retirerUnElement(cinema: CinemaDuFilm, elementId: string): void {
  cinema.elements = (cinema.elements ?? []).filter((e) => e.id !== elementId);
  retirerLaReferencePartout(cinema, elementId);
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

/**
 * Montre ou retire une référence (personnage OU créature) d'un plan.
 * `plan.personnages` et `plan.references` restent synchronisés : le premier
 * ne garde que les personnages (qui parlent, qui ont une réplique), le
 * second sert tel quel à Veo, dans l'ordre choisi.
 */
export function basculerUneReference(cinema: CinemaDuFilm, plan: PlanDeCinema, id: string): void {
  const actuelles = plan.references ?? plan.personnages;
  const dedans = actuelles.includes(id);
  const prochaines = dedans ? actuelles.filter((reference) => reference !== id) : [...actuelles, id];
  plan.references = prochaines;
  plan.personnages = prochaines.filter((candidat) => cinema.personnages.some((personnage) => personnage.id === candidat));
  if (dedans && plan.replique?.personnage === id) delete plan.replique;
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
