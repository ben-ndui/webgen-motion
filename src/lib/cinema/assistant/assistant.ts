import type { CinemaDuFilm } from "../../../../remotion/film/cinema/types";
import { erreursDuCinema } from "../../../../remotion/film/cinema/validerCinema";
import { type ResolvedAgent, resolveAgent } from "../../config-resolve";
import { chargerFilm } from "../../film-loader";
import { extractJsonBlock } from "../../llm-providers/anthropic";
import { trouverLaReference } from "../bible/etat";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus } from "../lieux";
import { type AppelerClaude, appelerClaude } from "../scenario-claude";
import { demandeALAssistant } from "./demandes";
import { lireLaReponse } from "./lecture";
import { type Proposition, lireLaDemande } from "./types";

export type ReponseDeLAssistant = { ok: true; proposition: Proposition } | Refus;

/**
 * Un geste de l'assistant de la série : Claude, avec la clé de la personne,
 * sur la série TELLE QU'ELLE EST À L'ÉCRAN (envoyée par l'écran, vérifiée par
 * le même validateur que la fiche). La marque vient de la fiche du disque.
 * Rien n'est enregistré : la proposition repart vers l'écran. SERVEUR SEULEMENT.
 */
export async function demanderALAssistant(
  id: string,
  cinemaDeLEcran: unknown,
  demandeBrute: unknown,
  partiel: Partial<Lieux> = {},
  agent: ResolvedAgent | null = resolveAgent(),
  appeler: AppelerClaude = appelerClaude,
): Promise<ReponseDeLAssistant> {
  const demande = lireLaDemande(demandeBrute);
  if (!demande) return { ok: false, statut: 400, raison: "Demande à l'assistant illisible." };
  const erreurs = erreursDuCinema({ cinema: cinemaDeLEcran });
  if (cinemaDeLEcran === undefined || erreurs.length > 0) {
    return { ok: false, statut: 400, raison: `La série a des erreurs, corrige-les d'abord : ${erreurs.slice(0, 2).join(" ; ")}` };
  }
  const cinema = cinemaDeLEcran as CinemaDuFilm;
  if (demande.type === "decrire-reference" && !trouverLaReference(cinema, demande.reference)) {
    return { ok: false, statut: 409, raison: "Cette référence a été retirée entre-temps." };
  }
  if (!agent) return { ok: false, statut: 412, raison: "Aucune clé Claude : ajoute-la dans les Réglages pour te faire aider." };
  if (agent.provider !== "anthropic") return { ok: false, statut: 412, raison: "L'assistant de la série fonctionne avec une clé Claude (Anthropic)." };

  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };

  const { systeme, message } = demandeALAssistant({ marque: fiche.spec.marque, direction: fiche.spec.direction }, cinema, demande);
  const reponse = await appeler(agent, systeme, message);
  if (!reponse.ok) return { ok: false, statut: 502, raison: reponse.raison };
  let json: unknown;
  try {
    json = JSON.parse(extractJsonBlock(reponse.texte));
  } catch {
    return { ok: false, statut: 502, raison: "La réponse de Claude n'était pas lisible : relance." };
  }
  const lecture = lireLaReponse(cinema, demande, json);
  return lecture.ok ? lecture : { ok: false, statut: 502, raison: lecture.raison };
}
