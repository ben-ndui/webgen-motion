import type { CinemaDuFilm, PlanDeCinema, RepliqueDuPlan } from "../../../../remotion/film/cinema/types";
import { PERSONNAGES_PAR_PLAN_MAX } from "../../../../remotion/film/cinema/types";
import { LONGUEUR_MAX_DE_CONSIGNE, LONGUEUR_MAX_DE_REPLIQUE } from "../../../../remotion/film/cinema/validerPlan";
import { ajouterLEpisodeEcrit } from "../scenario-lecture";
import type { DemandeALAssistant, Proposition } from "./types";

/**
 * Transformer la réponse de Claude en PROPOSITION, ou la refuser avec une
 * phrase. Module pur. Les prénoms deviennent des ids du casting, une
 * réplique n'est gardée que si celui qui parle est à l'image, et un texte
 * trop long est refusé plutôt que coupé au milieu d'un mot.
 */
export type LectureDeLAssistant = { ok: true; proposition: Proposition } | { ok: false; raison: string };

type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v);
const texte = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const refus = (raison: string): LectureDeLAssistant => ({ ok: false, raison });

function idDuPrenom(cinema: CinemaDuFilm, prenom: unknown): string | undefined {
  const cherche = texte(prenom).toLowerCase();
  return cinema.personnages.find((p) => p.nom.toLowerCase() === cherche)?.id;
}

const tousLesPlans = (cinema: CinemaDuFilm) => cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans));
const laScene = (cinema: CinemaDuFilm, id: string) => cinema.episodes.flatMap((e) => e.scenes).find((s) => s.id === id);

/** La réplique proposée pour un plan, si elle tient ; sinon la raison. */
function lireUneReplique(cinema: CinemaDuFilm, presents: string[], brute: unknown): RepliqueDuPlan | string {
  if (!estObjet(brute)) return "Claude n'a pas proposé de réplique.";
  const personnage = idDuPrenom(cinema, brute.personnage);
  const phrase = texte(brute.texte);
  if (!phrase) return "Claude a proposé une réplique vide.";
  if (!personnage || !presents.includes(personnage)) return `« ${texte(brute.personnage)} » n'est pas à l'image dans ce plan : la réplique ne peut pas être de lui.`;
  if (phrase.length > LONGUEUR_MAX_DE_REPLIQUE) return `La réplique proposée fait ${phrase.length} caractères (${LONGUEUR_MAX_DE_REPLIQUE} au plus pour 8 s) : redemande.`;
  return { personnage, texte: phrase };
}

function lireUneConsigne(brute: unknown): string | { raison: string } {
  const consigne = texte(brute);
  if (!consigne) return { raison: "Claude a proposé une consigne vide." };
  if (consigne.length > LONGUEUR_MAX_DE_CONSIGNE) return { raison: `La consigne proposée fait ${consigne.length} caractères (${LONGUEUR_MAX_DE_CONSIGNE} au plus) : redemande.` };
  return consigne;
}

function lireLePlanSuivant(cinema: CinemaDuFilm, sceneId: string, reponse: Objet): LectureDeLAssistant {
  const consigne = lireUneConsigne(reponse.consigne);
  if (typeof consigne !== "string") return refus(consigne.raison);
  const prenoms = Array.isArray(reponse.personnages) ? reponse.personnages : [];
  const personnages = [...new Set(prenoms.map((p) => idDuPrenom(cinema, p)).filter((id): id is string => !!id))].slice(0, PERSONNAGES_PAR_PLAN_MAX);
  const plan: Omit<PlanDeCinema, "id"> = { consigne, personnages, objet: reponse.objet === true && !!cinema.objet };
  if (estObjet(reponse.replique)) {
    const replique = lireUneReplique(cinema, personnages, reponse.replique);
    if (typeof replique === "string") return refus(replique);
    plan.replique = replique;
  }
  return { ok: true, proposition: { type: "plan-suivant", scene: sceneId, plan } };
}

function lireLesDialogues(cinema: CinemaDuFilm, sceneId: string, reponse: Objet): LectureDeLAssistant {
  const scene = laScene(cinema, sceneId);
  if (!scene) return refus("Cette scène n'existe plus.");
  const repliques: Record<string, RepliqueDuPlan | null> = Object.fromEntries(scene.plans.map((p) => [p.id, null]));
  for (const brute of Array.isArray(reponse.repliques) ? reponse.repliques.filter(estObjet) : []) {
    const plan = scene.plans[Number(brute.plan) - 1];
    if (!plan) continue;
    const replique = lireUneReplique(cinema, plan.personnages, brute);
    if (typeof replique === "string") return refus(`Plan ${Number(brute.plan)} : ${replique}`);
    repliques[plan.id] = replique;
  }
  if (Object.values(repliques).every((r) => r === null)) return refus("Claude n'a proposé aucune réplique pour cette scène.");
  return { ok: true, proposition: { type: "dialogues", scene: sceneId, repliques } };
}

export function lireLaReponse(cinema: CinemaDuFilm, demande: DemandeALAssistant, reponse: unknown): LectureDeLAssistant {
  if (!estObjet(reponse)) return refus("La réponse de Claude n'était pas lisible : relance.");
  switch (demande.type) {
    case "replique": {
      const plan = tousLesPlans(cinema).find((p) => p.id === demande.plan);
      if (!plan) return refus("Ce plan n'existe plus.");
      const replique = lireUneReplique(cinema, plan.personnages, reponse);
      return typeof replique === "string" ? refus(replique) : { ok: true, proposition: { type: "replique", plan: plan.id, replique } };
    }
    case "consigne": {
      const consigne = lireUneConsigne(reponse.consigne);
      return typeof consigne === "string" ? { ok: true, proposition: { type: "consigne", plan: demande.plan, consigne } } : refus(consigne.raison);
    }
    case "dialogues":
      return lireLesDialogues(cinema, demande.scene, reponse);
    case "plan-suivant":
      return lireLePlanSuivant(cinema, demande.scene, reponse);
    case "episode-suivant": {
      const lecture = ajouterLEpisodeEcrit(cinema, reponse);
      if (!lecture.ok) return refus(`L'épisode proposé ne tient pas : ${lecture.erreurs.slice(0, 3).join(" ; ")}`);
      const episode = lecture.cinema.episodes.find((e) => e.id === lecture.episodeId)!;
      const connus = new Set(cinema.personnages.map((p) => p.id));
      const nouveauxPersonnages = lecture.cinema.personnages.filter((p) => !connus.has(p.id));
      return { ok: true, proposition: { type: "episode-suivant", episode, nouveauxPersonnages } };
    }
  }
}
