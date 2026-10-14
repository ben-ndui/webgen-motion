import type { QualiteDeCinema } from "../../../remotion/film/cinema/types";
import { ecrireAtomiquement, genreDeVideo } from "../film-fichiers-deposes";

/**
 * Le client Veo 3.1 de l'API Gemini : lancer un plan, suivre l'opération,
 * télécharger la vidéo. Rien d'autre : le budget et la fiche se gèrent dans
 * generation.ts. SERVEUR SEULEMENT.
 */
export const API_VEO = "https://generativelanguage.googleapis.com/v1beta";

export const MODELES_VEO: Record<QualiteDeCinema, string> = {
  fast: "veo-3.1-fast-generate-preview",
  lite: "veo-3.1-lite-generate-preview",
};

// Lite refuse le paramètre `negativePrompt` (« isn't supported by this
// model », recette réelle du 14/10) : ses interdits passent dans le prompt.
const ACCEPTE_UN_NEGATIF: Record<QualiteDeCinema, boolean> = { fast: true, lite: false };

/** Le corps de la requête de lancement, selon ce que le modèle accepte. */
export function corpsDuLancement(demande: { qualite: QualiteDeCinema; prompt: string; negatif: string }): unknown {
  const parametres = { aspectRatio: "9:16", resolution: "1080p", durationSeconds: 8 };
  if (ACCEPTE_UN_NEGATIF[demande.qualite]) {
    return { instances: [{ prompt: demande.prompt }], parameters: { ...parametres, negativePrompt: demande.negatif } };
  }
  return { instances: [{ prompt: `${demande.prompt} Avoid: ${demande.negatif}.` }], parameters: parametres };
}

// Barème relevé sur ai.google.dev/gemini-api/docs/pricing (09/2026) : 8 s en
// 1080p, audio compris. Google ne facture pas un plan qui n'aboutit pas.
export const COUT_D_UN_PLAN_USD: Record<QualiteDeCinema, number> = { fast: 0.96, lite: 0.64 };

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
  if (statut === 401 || statut === 403) return "Google refuse la clé Gemini : vérifie-la dans les Réglages.";
  if (statut === 429) return "Quota Google atteint ou facturation coupée : vérifie la facturation de ton projet Google AI Studio.";
  const message = (corps as ErreurGoogle | null)?.error?.message;
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

export async function lancerUnPlan(
  client: ClientVeo,
  demande: { qualite: QualiteDeCinema; prompt: string; negatif: string },
): Promise<Lancement> {
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/models/${MODELES_VEO[demande.qualite]}:predictLongRunning`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": client.cle },
      body: JSON.stringify(corpsDuLancement(demande)),
    });
  } catch {
    return { ok: false, statut: 0, raison: "Google injoignable : vérifie ta connexion." };
  }
  const corps = await lireJson(reponse);
  const nom = (corps as { name?: unknown } | null)?.name;
  if (!reponse.ok || typeof nom !== "string") return { ok: false, statut: reponse.status, raison: raisonDuRefus(reponse.status, corps) };
  return { ok: true, operation: nom };
}

type Operation = {
  done?: boolean;
  error?: { message?: string };
  response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[]; raiMediaFilteredReasons?: string[] } };
};

export async function suivreUnPlan(client: ClientVeo, operation: string): Promise<Suivi> {
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/${operation}`, { headers: { "x-goog-api-key": client.cle } });
  } catch {
    return { etat: "injoignable", raison: "Google injoignable : la génération continue peut-être, réessaie dans un instant." };
  }
  const corps = (await lireJson(reponse)) as Operation | null;
  if (!reponse.ok || !corps) return { etat: "injoignable", raison: raisonDuRefus(reponse.status, corps) };
  if (!corps.done) return { etat: "en-cours" };
  if (corps.error) return { etat: "refuse", raison: `Google a arrêté ce plan : ${corps.error.message ?? "raison non donnée"}` };
  const resultat = corps.response?.generateVideoResponse;
  const uri = resultat?.generatedSamples?.[0]?.video?.uri;
  if (uri) return { etat: "pret", uri };
  const filtres = resultat?.raiMediaFilteredReasons?.join(" ") || "aucune vidéo rendue";
  return { etat: "refuse", raison: `Google a refusé ce plan (filtre de sécurité) : ${filtres}` };
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
