import type { QualiteDeCinema } from "../../../remotion/film/cinema/types";
import { ecrireAtomiquement, genreDeVideo } from "../film-fichiers-deposes";

/**
 * Le client vidéo de l'API Gemini. PONT MINIMAL (01/11/2026) : Google a retiré
 * Veo de ce compte et l'a remplacé par Gemini Omni Flash — contrat différent
 * (`POST /interactions`, réponse SYNCHRONE qui contient déjà la vidéo ; fini
 * `predictLongRunning` + `operations.get`). Pour ne pas bloquer une
 * production en cours, ce pont fait juste marcher un plan avec le nouveau
 * modèle. Une vraie migration reste à faire : un seul modèle (fini la
 * distinction Fast/Lite), des clips de 10 s rendus (pas 8, aucun paramètre de
 * durée documenté chez Google), un coût facturé au token (couts.ts garde
 * l'ancien tarif Veo, pas encore mis à jour), et les tests de generation.ts /
 * fond-sur-mesure.ts / photo-du-produit.ts qui simulaient encore le
 * lancement-puis-sondage en deux appels (ce pont n'en fait plus qu'un).
 * Le budget et la fiche se gèrent dans generation.ts. SERVEUR SEULEMENT.
 */
export const API_VEO = "https://generativelanguage.googleapis.com/v1beta";

const MODELE_OMNI = "gemini-omni-1.1-flash";

/** Un portrait de personnage envoyé en référence, pour garder son visage. */
export type ImageDeReference = { octets: Uint8Array; mimeType: "image/jpeg" | "image/png" };

export type DemandeDePlan = {
  qualite: QualiteDeCinema;
  prompt: string;
  negatif: string;
  references?: ImageDeReference[];
  // Vertical par défaut (la série) ; le décor d'un clip YouTube se génère en 16:9.
  format?: "9:16" | "16:9";
};

/** Le corps de la requête à Gemini Omni Flash. Pas de `negativePrompt` documenté : les interdits passent toujours dans le prompt. */
export function corpsDuLancement(demande: DemandeDePlan): unknown {
  const references = demande.references ?? [];
  const texte = demande.negatif ? `${demande.prompt} Avoid: ${demande.negatif}.` : demande.prompt;
  const input: unknown[] = [{ type: "text", text: texte }];
  for (const reference of references) {
    input.push({ type: "image", data: Buffer.from(reference.octets).toString("base64"), mime_type: reference.mimeType });
  }
  return {
    model: MODELE_OMNI,
    input,
    response_format: { type: "video", aspect_ratio: demande.format ?? "9:16", resolution: "720p", delivery: "uri" },
    generation_config: { video_config: { task: references.length > 0 ? "reference_to_video" : "text_to_video" } },
  };
}

const POIDS_MAX = 80 * 1024 * 1024;

export type ClientVeo = { base: string; cle: string };

export type Lancement = { ok: true; operation: string } | { ok: false; statut: number; raison: string };
export type Suivi =
  | { etat: "en-cours" }
  | { etat: "pret"; uri: string }
  | { etat: "refuse"; raison: string }
  // Réseau coupé ou Google en panne : l'opération continue peut-être, on ne l'abandonne pas.
  | { etat: "injoignable"; raison: string };

type ErreurGoogle = { error?: { message?: string } };

export function raisonDuRefus(statut: number, corps: unknown): string {
  const message = (corps as ErreurGoogle | null)?.error?.message;
  if (statut === 401 || statut === 403) return "Google refuse la clé Gemini : vérifie-la dans les Réglages.";
  // Le détail de Google dit si c'est la limite par minute (attendre) ou le
  // crédit (recharger) : la même phrase pour les deux ferait chercher au mauvais endroit.
  if (statut === 429) {
    const detail = message ? ` Détail de Google : ${message}` : "";
    return `Quota Google atteint ou facturation coupée : attends une minute, sinon vérifie le crédit de ton projet Google AI Studio.${detail}`;
  }
  // 402 : le compte n'a plus de crédit prépayé. Rien n'est facturé, il faut recharger.
  if (statut === 402) return "Plus de crédit sur ton compte Google AI Studio : recharge-le, puis relance.";
  if (statut === 400 && message) return `Google refuse la demande : ${message}`;
  return `Google ne répond pas comme prévu (${statut}).`;
}

async function lireJson(reponse: Response): Promise<unknown> {
  try {
    return await reponse.json();
  } catch {
    return null;
  }
}

export async function lancerUnPlan(client: ClientVeo, demande: DemandeDePlan): Promise<Lancement> {
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": client.cle },
      body: JSON.stringify(corpsDuLancement(demande)),
    });
  } catch {
    return { ok: false, statut: 0, raison: "Google injoignable : vérifie ta connexion." };
  }
  const corps = (await lireJson(reponse)) as ReponseOmni | null;
  if (!reponse.ok || !corps) return { ok: false, statut: reponse.status, raison: raisonDuRefus(reponse.status, corps) };
  const uri = corps.status === "completed" ? uriDeLaReponse(corps) : undefined;
  if (!uri) return { ok: false, statut: 502, raison: "Gemini Omni Flash n'a rendu aucune vidéo exploitable." };
  // Omni répond du premier coup : rien à sonder ensuite, l'adresse de la
  // vidéo part directement dans « l'opération » que generation.ts note sur
  // le disque. `suivreUnPlan` la retrouve sans rappeler Google.
  return { ok: true, operation: `${OPERATION_PRETE}${uri}` };
}

type ReponseOmni = { status?: string; steps?: { type?: string; content?: { type?: string; uri?: string }[] }[] };

function uriDeLaReponse(corps: ReponseOmni): string | undefined {
  for (const etape of corps.steps ?? []) {
    if (etape.type !== "model_output") continue;
    const video = (etape.content ?? []).find((item) => item.type === "video" && typeof item.uri === "string");
    if (video?.uri) return video.uri;
  }
  return undefined;
}

const OPERATION_PRETE = "omni-pret:";

export async function suivreUnPlan(_client: ClientVeo, operation: string): Promise<Suivi> {
  if (operation.startsWith(OPERATION_PRETE)) return { etat: "pret", uri: operation.slice(OPERATION_PRETE.length) };
  return { etat: "refuse", raison: "Cette génération vient d'un ancien format (Veo), abandonné par Google : relance ce plan." };
}

/**
 * Télécharge la vidéo d'un plan prêt. La clé part dans l'en-tête : on ne
 * l'envoie qu'au serveur de l'API, jamais à une adresse que la réponse aurait
 * pu désigner ailleurs.
 */
export async function telechargerLePlan(client: ClientVeo, uri: string, destination: string): Promise<boolean> {
  try {
    if (new URL(uri).origin !== new URL(client.base).origin) return false;
    const reponse = await fetch(uri, { headers: { "x-goog-api-key": client.cle } });
    if (!reponse.ok) return false;
    const octets = new Uint8Array(await reponse.arrayBuffer());
    if (octets.byteLength === 0 || octets.byteLength > POIDS_MAX || genreDeVideo(octets) !== "mp4") return false;
    ecrireAtomiquement(destination, octets);
    return true;
  } catch {
    return false;
  }
}
