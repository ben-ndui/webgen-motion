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

// Relevé en réel le 14/10 : Lite refuse `negativePrompt` et `referenceImages` ;
// Fast refuse `negativePrompt` dès qu'il reçoit un portrait en référence
// (« not supported in your use case »). Seul Fast sans portrait prend le
// paramètre ; partout ailleurs, les interdits passent dans le prompt.
function accepteUnNegatif(qualite: QualiteDeCinema, avecPortraits: boolean): boolean {
  return qualite === "fast" && !avecPortraits;
}

/** Un portrait de personnage envoyé en référence, pour garder son visage. */
export type ImageDeReference = { octets: Uint8Array; mimeType: "image/jpeg" | "image/png" };

export type DemandeDePlan = { qualite: QualiteDeCinema; prompt: string; negatif: string; references?: ImageDeReference[] };

/** Le corps de la requête de lancement, selon ce que le modèle accepte. */
export function corpsDuLancement(demande: DemandeDePlan): unknown {
  const references = demande.references ?? [];
  // Lite refuse aussi `referenceImages` : choisirLeModele ne l'y envoie jamais.
  if (references.length > 0 && demande.qualite === "lite") {
    throw new Error("Veo Lite n'accepte pas de portrait en référence : ce plan doit passer en Fast.");
  }
  const parametres = { aspectRatio: "9:16", resolution: "1080p", durationSeconds: 8 };
  const instance: Record<string, unknown> = { prompt: demande.prompt };
  if (references.length > 0) {
    instance.referenceImages = references.map((reference) => ({
      image: { bytesBase64Encoded: Buffer.from(reference.octets).toString("base64"), mimeType: reference.mimeType },
      referenceType: "asset",
    }));
  }
  if (accepteUnNegatif(demande.qualite, references.length > 0)) {
    return { instances: [instance], parameters: { ...parametres, negativePrompt: demande.negatif } };
  }
  return { instances: [{ ...instance, prompt: `${demande.prompt} Avoid: ${demande.negatif}.` }], parameters: parametres };
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

export async function lancerUnPlan(client: ClientVeo, demande: DemandeDePlan): Promise<Lancement> {
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
