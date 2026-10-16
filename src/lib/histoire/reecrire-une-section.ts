import { type ResolvedAgent, resolveAgent } from "../config-resolve";
import { type AppelerClaude, appelerClaude } from "../cinema/scenario-claude";
import { chargerFilm, getFilmsDir } from "../film-loader";
import { getFilmDir } from "../film-store";
import { languesDuFilm } from "../film-fiche-depart";
import { extractJsonBlock } from "../llm-providers/anthropic";
import { lireLaMemoire } from "../site/memoire-du-site";
import { CONSIGNE_MAX, type Reecriture, demandeDeReecriture, lireLaReecriture } from "./reecriture";
import { champsDeLaSection, estUneSection } from "./sections";

export type Refus = { ok: false; statut: 400 | 404 | 409 | 412 | 502; raison: string };
export type ReponseDeLaReecriture = { ok: true; champs: Record<string, string>; aEcrireSoiMeme: string[] } | Refus;
export type Lieux = { fiches: string; dossier: (id: string) => string };

const A_EVITER_MAX = 30;

/**
 * « Écrire avec Claude » sur une section de « Ton histoire », avec la clé de
 * la personne. Les textes viennent de la fiche du disque (enregistrée au
 * fil de l'eau), les faits de la mémoire du site. Rien n'est enregistré :
 * la proposition repart vers l'écran, qui la garde ou non. SERVEUR SEULEMENT.
 */
export async function reecrireUneSection(
  id: string,
  corps: unknown,
  lieux: Lieux = { fiches: getFilmsDir(), dossier: getFilmDir },
  agent: ResolvedAgent | null = resolveAgent(),
  appeler: AppelerClaude = appelerClaude,
): Promise<ReponseDeLaReecriture> {
  const d = (typeof corps === "object" && corps !== null ? corps : {}) as Record<string, unknown>;
  if (!estUneSection(d.section)) return { ok: false, statut: 400, raison: "Section inconnue." };
  if (!agent) return { ok: false, statut: 412, raison: "Aucune clé Claude : ajoute-la dans les Réglages pour te faire aider." };
  if (agent.provider !== "anthropic") return { ok: false, statut: 412, raison: "« Écrire avec Claude » fonctionne avec une clé Claude (Anthropic)." };

  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };
  const langue = languesDuFilm(fiche.spec).find((l) => l === d.langue);
  if (!langue) return { ok: false, statut: 400, raison: "Ce film n'est pas rédigé dans cette langue." };

  if (champsDeLaSection(d.section, fiche.spec.textes[langue]).length === 0) {
    return { ok: false, statut: 400, raison: "Ce film n'a pas de Reels : rien à écrire ici." };
  }
  const consigne = typeof d.consigne === "string" ? d.consigne.replace(/\s+/g, " ").trim().slice(0, CONSIGNE_MAX) : "";
  const aEviter = Array.isArray(d.aEviter) ? d.aEviter.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 200)).slice(-A_EVITER_MAX) : [];
  const demande = {
    marque: fiche.spec.marque.nom ?? "",
    langue,
    section: d.section,
    textes: fiche.spec.textes[langue],
    memoire: lireLaMemoire(id, lieux.dossier),
    consigne,
    aEviter,
  };
  const { systeme, message } = demandeDeReecriture(demande);
  const reponse = await appeler(agent, systeme, message);
  if (!reponse.ok) return { ok: false, statut: 502, raison: reponse.raison };
  let json: unknown;
  try {
    json = JSON.parse(extractJsonBlock(reponse.texte));
  } catch {
    return { ok: false, statut: 502, raison: "La réponse de Claude n'était pas lisible : relance." };
  }
  const lecture: Reecriture = lireLaReecriture(demande, json);
  return lecture.ok ? lecture : { ok: false, statut: 502, raison: lecture.raison };
}
