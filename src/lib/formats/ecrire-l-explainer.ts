import type { ExplainerSpec } from "../../../remotion/film/explainer/spec";
import { scenesTropCourtes } from "../../../remotion/film/explainer/rythme";
import { erreursDeLExplainer } from "../../../remotion/film/explainer/validerExplainer";
import type { ResolvedAgent } from "../config-resolve";
import { type AppelerAvecOutil, appelerClaudeAvecOutil } from "./claude-outil";
import { OUTIL_EXPLAINER, demandeDExplainer, nombresInventes } from "./demande-explainer";
import { explainerDepuisClaude } from "./explainer-depuis-claude";

/**
 * Faire écrire un explainer par Claude, avec la clé de l'utilisateur. Rend une
 * PROPOSITION (scènes et textes FR/EN) sans rien enregistrer : l'écran la
 * montre, la personne la garde ou en demande une autre. SERVEUR SEULEMENT.
 *
 * Deux gardes par le CODE, pas par la consigne : la proposition doit être un
 * explainer valide, et aucun nombre ne doit être absent des notes.
 */

export const LONGUEUR_MAX_DES_NOTES = 3000;

export type PropositionDExplainer = Pick<ExplainerSpec, "scenes" | "textes">;
export type ReponseDeLEcriture = { ok: true; proposition: PropositionDExplainer } | { ok: false; statut: 400 | 412 | 502; raison: string };

/** Allonge d'une mesure les scènes trop courtes pour être lues (le rythme est une affaire de code). */
function allongerLesScenes(spec: ExplainerSpec): ExplainerSpec {
  const copie = structuredClone(spec);
  for (let tour = 0; tour < 4; tour += 1) {
    const courtes = new Set([...scenesTropCourtes(copie, "fr"), ...scenesTropCourtes(copie, "en")]);
    if (courtes.size === 0) break;
    for (const scene of copie.scenes) if (courtes.has(scene.id)) scene.mesures += 1;
  }
  return copie;
}

export async function ecrireLExplainer(
  spec: ExplainerSpec,
  sujet: string,
  notes: string,
  agent: ResolvedAgent | null,
  appeler: AppelerAvecOutil = appelerClaudeAvecOutil,
): Promise<ReponseDeLEcriture> {
  if (sujet.trim().length < 5) return { ok: false, statut: 400, raison: "Dis en une phrase de quoi parle la vidéo." };
  if (notes.trim().length < 20) return { ok: false, statut: 400, raison: "Donne quelques faits dans les notes : Claude n'écrit qu'à partir d'eux." };
  if (notes.length > LONGUEUR_MAX_DES_NOTES) return { ok: false, statut: 400, raison: `Les notes font ${notes.length} caractères, ${LONGUEUR_MAX_DES_NOTES} au plus.` };
  if (!agent) return { ok: false, statut: 412, raison: "Aucune clé Claude : ajoute-la dans les Réglages pour écrire avec Claude." };
  if (agent.provider !== "anthropic") return { ok: false, statut: 412, raison: "L'écriture fonctionne avec une clé Claude (Anthropic)." };

  const { systeme, message } = demandeDExplainer(spec, sujet, notes);
  const reponse = await appeler(agent, systeme, message, OUTIL_EXPLAINER);
  if (!reponse.ok) return { ok: false, statut: 502, raison: reponse.raison };
  // Valider AVANT de toucher au rythme : une scène sans mots (vu avec un vrai Claude le 17/10) fait
  // planter le calcul des temps, et la route rendait une erreur 500 au lieu de dire pourquoi.
  const brute = { ...spec, ...explainerDepuisClaude(reponse.entree) };
  const erreurs = erreursDeLExplainer(brute);
  if (erreurs.length > 0) return { ok: false, statut: 502, raison: `La proposition ne tient pas : ${erreurs.slice(0, 3).join(" ; ")}. Relance.` };
  const proposee = allongerLesScenes(brute);
  const inventes = nombresInventes(proposee.textes, notes);
  if (inventes.length > 0) {
    return { ok: false, statut: 502, raison: `Claude a écrit ${inventes.join(", ")}, absent de tes notes : relance, ou ajoute la source du chiffre aux notes.` };
  }
  return { ok: true, proposition: { scenes: proposee.scenes, textes: proposee.textes } };
}
