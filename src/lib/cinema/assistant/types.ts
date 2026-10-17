import type { EpisodeDeCinema, Personnage, RepliqueDuPlan } from "../../../../remotion/film/cinema/types";

/**
 * Les gestes de l'assistant de la série, et ce que Claude propose en
 * retour. Une proposition n'est JAMAIS appliquée par le serveur : l'écran la
 * montre, la personne la garde ou non.
 */
// `aEviter` : ce que Claude a déjà proposé et qu'on a écarté (« Autre
// proposition ») ; sans ça, il rend volontiers deux fois la même chose.
export type DemandeALAssistant =
  | { type: "replique"; episode: string; plan: string; aEviter?: string[] }
  | { type: "consigne"; episode: string; plan: string; aEviter?: string[] }
  | { type: "dialogues"; episode: string; scene: string; aEviter?: string[] }
  | { type: "plan-suivant"; episode: string; scene: string; aEviter?: string[] }
  | { type: "episode-suivant"; note?: string; aEviter?: string[] }
  // Un personnage, une créature, un objet ou un décor de la bible visuelle.
  | { type: "decrire-reference"; reference: string; aEviter?: string[] };

export type PlanPropose = { consigne: string; personnages: string[]; objet: boolean; replique?: RepliqueDuPlan };

export type Proposition =
  | { type: "replique"; plan: string; replique: RepliqueDuPlan }
  | { type: "consigne"; plan: string; consigne: string }
  // Une entrée par plan de la scène : sa réplique, ou null s'il reste muet.
  | { type: "dialogues"; scene: string; repliques: Record<string, RepliqueDuPlan | null> }
  | { type: "plan-suivant"; scene: string; plan: PlanPropose }
  // Le nouvel épisode, et les personnages qu'il crée (les autres existent déjà).
  | { type: "episode-suivant"; episode: EpisodeDeCinema; nouveauxPersonnages: Personnage[] }
  | { type: "decrire-reference"; reference: string; description: string };

/** Les textes d'une proposition, pour demander « autre chose » à Claude. */
export function textesDe(proposition: Proposition): string[] {
  switch (proposition.type) {
    case "replique":
      return [proposition.replique.texte];
    case "consigne":
      return [proposition.consigne];
    case "dialogues":
      return Object.values(proposition.repliques).flatMap((r) => (r ? [r.texte] : []));
    case "plan-suivant":
      return [proposition.plan.consigne];
    case "episode-suivant":
      return [proposition.episode.titre];
    case "decrire-reference":
      return [proposition.description];
  }
}

const TYPES = ["replique", "consigne", "dialogues", "plan-suivant", "episode-suivant", "decrire-reference"] as const;

/** La demande envoyée par l'écran, ou null si elle ne tient pas. */
export function lireLaDemande(brute: unknown): DemandeALAssistant | null {
  if (typeof brute !== "object" || brute === null) return null;
  const d = brute as Record<string, unknown>;
  const chaine = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 100;
  if (!TYPES.includes(d.type as (typeof TYPES)[number])) return null;
  // Au plus cinq propositions écartées, chacune bornée : la demande reste courte.
  const aEviter = Array.isArray(d.aEviter) ? d.aEviter.filter((t): t is string => typeof t === "string").slice(-5).map((t) => t.slice(0, 600)) : undefined;
  if (d.type === "episode-suivant") return { type: "episode-suivant", note: typeof d.note === "string" ? d.note.slice(0, 2000) : undefined, aEviter };
  if (d.type === "decrire-reference" && chaine(d.reference)) return { type: "decrire-reference", reference: d.reference, aEviter };
  if (!chaine(d.episode)) return null;
  if ((d.type === "replique" || d.type === "consigne") && chaine(d.plan)) return { type: d.type, episode: d.episode, plan: d.plan, aEviter };
  if ((d.type === "dialogues" || d.type === "plan-suivant") && chaine(d.scene)) return { type: d.type, episode: d.episode, scene: d.scene, aEviter };
  return null;
}

