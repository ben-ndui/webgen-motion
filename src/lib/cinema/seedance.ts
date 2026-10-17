import { ecrireAtomiquement, genreDeVideo } from "../film-fichiers-deposes";

/**
 * Le client Seedance 2.5 (ByteDance, via fal.ai) : lancer un plan, suivre sa
 * file d'attente, télécharger la vidéo. Même rôle que veo.ts pour le second
 * fournisseur du cinéma. SERVEUR SEULEMENT.
 *
 * Les images de référence partent en data URI, comme Veo (base64 inline) :
 * pas d'étape d'upload vers le CDN public de fal.ai, donc pas de photo du
 * client qui transite par un hébergement tiers avant la génération.
 */
export const API_FAL = "https://queue.fal.run";
export const MODELE_SEEDANCE = "bytedance/seedance-2.5/us/reference-to-video";

// La vidéo prête vit sur un domaine DIFFÉRENT de l'API (queue.fal.run vs
// *.fal.media) : le domaine de confiance se transporte avec le client, pas
// déduit de `base` comme pour Veo (même hôte des deux côtés chez Google).
export type ClientFal = { base: string; cle: string; domainesMedia: string[] };

export const DOMAINES_FAL_PAR_DEFAUT = ["fal.media", "fal.run", "fal.ai"];

export type ImageDeReference = { octets: Uint8Array; mimeType: "image/jpeg" | "image/png" };
export type DemandeDePlanSeedance = { prompt: string; negatif?: string; references?: ImageDeReference[] };

function versDataUri(image: ImageDeReference): string {
  return `data:${image.mimeType};base64,${Buffer.from(image.octets).toString("base64")}`;
}

/**
 * Le corps de la requête de lancement : 9:16, 1080p, 8 s, comme un plan Veo.
 * Seedance n'a pas de `negative_prompt` : les interdits partent dans le
 * prompt, comme Veo Lite le fait déjà pour la même raison.
 */
export function corpsDuLancement(demande: DemandeDePlanSeedance): unknown {
  const image_urls = (demande.references ?? []).map(versDataUri);
  return {
    prompt: demande.negatif ? `${demande.prompt} Avoid: ${demande.negatif}.` : demande.prompt,
    ...(image_urls.length > 0 ? { image_urls } : {}),
    resolution: "1080p",
    duration: "8",
    aspect_ratio: "9:16",
  };
}

export type Lancement = { ok: true; operation: string } | { ok: false; statut: number; raison: string };
export type Suivi =
  | { etat: "en-cours" }
  | { etat: "pret"; uri: string }
  | { etat: "refuse"; raison: string }
  // Réseau coupé ou fal.ai en panne : la génération continue peut-être, on ne l'abandonne pas.
  | { etat: "injoignable"; raison: string };

type ErreurFal = { detail?: string | { msg?: string }[] };

export function raisonDuRefus(statut: number, corps: unknown): string {
  const detail = (corps as ErreurFal | null)?.detail;
  const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).filter(Boolean).join(" ; ") : undefined;
  if (statut === 401 || statut === 403) return "fal.ai refuse la clé : vérifie-la dans les Réglages.";
  if (statut === 429) return `Quota fal.ai atteint ou crédit épuisé : attends un instant, sinon recharge ton compte fal.ai.${message ? ` Détail : ${message}` : ""}`;
  if (statut === 422 && message) return `fal.ai refuse la demande : ${message}`;
  return `fal.ai ne répond pas comme prévu (${statut}).`;
}

async function lireJson(reponse: Response): Promise<unknown> {
  try {
    return await reponse.json();
  } catch {
    return null;
  }
}

export async function lancerUnPlan(client: ClientFal, demande: DemandeDePlanSeedance): Promise<Lancement> {
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/${MODELE_SEEDANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${client.cle}` },
      body: JSON.stringify(corpsDuLancement(demande)),
    });
  } catch {
    return { ok: false, statut: 0, raison: "fal.ai injoignable : vérifie ta connexion." };
  }
  const corps = await lireJson(reponse);
  const id = (corps as { request_id?: unknown } | null)?.request_id;
  if (!reponse.ok || typeof id !== "string") return { ok: false, statut: reponse.status, raison: raisonDuRefus(reponse.status, corps) };
  return { ok: true, operation: id };
}

type StatutEnFile = { status?: string; error?: string };
type Resultat = { video?: { url?: string } };

/**
 * Un plan FINI chez fal.ai (statut COMPLETED) ne veut pas dire « vidéo
 * obtenue » : la relecture du résultat peut échouer AUTREMENT qu'un vrai
 * refus (502/503/429 passagers). Seule une réponse qui dit explicitement
 * que la demande est invalide (422), ou un résultat sans vidéo, est un
 * refus — tout le reste doit rester « injoignable » pour être retenté,
 * sinon un plan DÉJÀ FACTURÉ serait rendu au budget et perdu pour rien.
 */
export async function suivreUnPlan(client: ClientFal, requestId: string): Promise<Suivi> {
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/${MODELE_SEEDANCE}/requests/${requestId}/status`, { headers: { Authorization: `Key ${client.cle}` } });
  } catch {
    return { etat: "injoignable", raison: "fal.ai injoignable : la génération continue peut-être, réessaie dans un instant." };
  }
  const corps = (await lireJson(reponse)) as StatutEnFile | null;
  if (!reponse.ok || !corps) return { etat: "injoignable", raison: raisonDuRefus(reponse.status, corps) };
  if (corps.status === "IN_QUEUE" || corps.status === "IN_PROGRESS") return { etat: "en-cours" };
  if (corps.status === "COMPLETED" && corps.error) return { etat: "refuse", raison: `fal.ai a refusé ce plan : ${corps.error}` };
  if (corps.status !== "COMPLETED") return { etat: "refuse", raison: `fal.ai a arrêté ce plan (statut ${corps.status ?? "inconnu"}).` };

  let resultat: Response;
  try {
    resultat = await fetch(`${client.base}/${MODELE_SEEDANCE}/requests/${requestId}/response`, { headers: { Authorization: `Key ${client.cle}` } });
  } catch {
    return { etat: "injoignable", raison: "fal.ai injoignable : le résultat est prêt, réessaie dans un instant." };
  }
  const corpsResultat = (await lireJson(resultat)) as Resultat | null;
  if (!resultat.ok) {
    if (resultat.status === 422) return { etat: "refuse", raison: `fal.ai n'a rendu aucune vidéo pour ce plan (${raisonDuRefus(resultat.status, corpsResultat)}).` };
    // 429/5xx sur un plan déjà payé et terminé : à retenter, pas à perdre.
    return { etat: "injoignable", raison: `fal.ai dit ce plan terminé mais le résultat est provisoirement indisponible (${raisonDuRefus(resultat.status, corpsResultat)}) : nouvel essai au prochain passage.` };
  }
  const uri = corpsResultat?.video?.url;
  if (!uri) return { etat: "refuse", raison: "fal.ai dit ce plan terminé mais n'a rendu aucune vidéo." };
  return { etat: "pret", uri };
}

const POIDS_MAX = 80 * 1024 * 1024;

function serviParUnDomaineDeConfiance(url: string, domaines: string[]): boolean {
  try {
    const hote = new URL(url).hostname;
    return domaines.some((domaine) => hote === domaine || hote.endsWith(`.${domaine}`));
  } catch {
    return false;
  }
}

/**
 * Télécharge la vidéo d'un plan prêt, UNIQUEMENT depuis un domaine de
 * confiance (la vidéo prête n'est jamais allée chercher ailleurs, même si un
 * corps de réponse était un jour altéré). Aucune clé à envoyer : le lien est public.
 */
export async function telechargerLePlan(client: ClientFal, uri: string, destination: string): Promise<boolean> {
  try {
    if (!serviParUnDomaineDeConfiance(uri, client.domainesMedia)) return false;
    const reponse = await fetch(uri);
    if (!reponse.ok) return false;
    const octets = new Uint8Array(await reponse.arrayBuffer());
    if (octets.byteLength === 0 || octets.byteLength > POIDS_MAX || genreDeVideo(octets) !== "mp4") return false;
    ecrireAtomiquement(destination, octets);
    return true;
  } catch {
    return false;
  }
}
