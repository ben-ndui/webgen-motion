import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { type ResolvedAgent, resolveAgent } from "../config-resolve";
import { chargerFilm } from "../film-loader";
import { API_URL, API_VERSION, extractJsonBlock } from "../llm-providers/anthropic";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus } from "./lieux";
import { demandeDeScenario } from "./scenario-demande";
import { ajouterLEpisodeEcrit } from "./scenario-lecture";

/**
 * Faire écrire un épisode par Claude, avec la clé de l'utilisateur (aucun
 * proxy). Rend la série PROPOSÉE (l'existante + le nouvel épisode) sans
 * l'enregistrer : c'est l'écran qui la pose dans la fiche, la personne relit
 * avant de payer le moindre plan. SERVEUR SEULEMENT.
 */
export const LONGUEUR_MAX_DU_BRIEF = 2000;

const MAX_TOKENS_PAR_DEFAUT = 6000;

// Envoie la demande et rend le texte de Claude (remplacé par un faux dans les tests).
// `maxTokens` : à monter pour un geste qui peut rendre beaucoup de texte (une
// bible entière à extraire), sinon la réponse par défaut suffit.
export type AppelerClaude = (agent: ResolvedAgent, systeme: string, message: string, maxTokens?: number) => Promise<{ ok: true; texte: string } | { ok: false; raison: string }>;

export const appelerClaude: AppelerClaude = async (agent, systeme, message, maxTokens = MAX_TOKENS_PAR_DEFAUT) => {
  let reponse: Response;
  try {
    reponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": agent.apiKey, "anthropic-version": API_VERSION },
      body: JSON.stringify({ model: agent.model, max_tokens: maxTokens, system: systeme, messages: [{ role: "user", content: message }], temperature: 0.7 }),
    });
  } catch {
    return { ok: false, raison: "Claude injoignable : vérifie ta connexion." };
  }
  if (!reponse.ok) return { ok: false, raison: `Claude a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 200)}` };
  const corps = (await reponse.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  // Une réponse coupée rend un JSON incomplet : refusée plutôt que prise pour un résultat court.
  if (corps.stop_reason === "max_tokens") return { ok: false, raison: "La réponse de Claude a été coupée : raccourcis le texte envoyé et réessaie." };
  return { ok: true, texte: (corps.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n") };
};

export type ReponseDuScenario = { ok: true; cinema: CinemaDuFilm; episodeId: string } | Refus;

/** Écrire l'épisode à partir d'une fiche déjà en mémoire (le remplissage depuis le site s'en sert). */
export async function ecrireUnEpisodePourLaFiche(
  spec: FilmSpec,
  brief: string,
  agent: ResolvedAgent | null,
  appeler: AppelerClaude = appelerClaude,
): Promise<ReponseDuScenario> {
  if (brief.trim().length < 10) return { ok: false, statut: 400, raison: "Décris en quelques phrases ce que veut la cliente." };
  if (brief.length > LONGUEUR_MAX_DU_BRIEF) return { ok: false, statut: 400, raison: `Le brief fait ${brief.length} caractères, ${LONGUEUR_MAX_DU_BRIEF} au plus.` };
  if (!agent) return { ok: false, statut: 412, raison: "Aucune clé Claude : ajoute-la dans les Réglages pour écrire un épisode." };
  if (agent.provider !== "anthropic") return { ok: false, statut: 412, raison: "L'écriture d'un épisode fonctionne avec une clé Claude (Anthropic)." };
  const { systeme, message } = demandeDeScenario(spec, brief);
  const reponse = await appeler(agent, systeme, message);
  if (!reponse.ok) return { ok: false, statut: 502, raison: reponse.raison };
  let json: unknown;
  try {
    json = JSON.parse(extractJsonBlock(reponse.texte));
  } catch {
    return { ok: false, statut: 502, raison: "La réponse de Claude n'était pas lisible : relance." };
  }
  const lecture = ajouterLEpisodeEcrit(spec.cinema, json);
  if (!lecture.ok) return { ok: false, statut: 502, raison: `L'épisode proposé ne tient pas : ${lecture.erreurs.slice(0, 3).join(" ; ")}` };
  return lecture;
}

export async function ecrireUnEpisode(
  id: string,
  brief: string,
  partiel: Partial<Lieux> = {},
  agent: ResolvedAgent | null = resolveAgent(),
  appeler: AppelerClaude = appelerClaude,
): Promise<ReponseDuScenario> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  if (brief.trim().length < 10) return { ok: false, statut: 400, raison: "Décris en quelques phrases ce que veut la cliente." };
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };
  return ecrireUnEpisodePourLaFiche(fiche.spec, brief, agent, appeler);
}
