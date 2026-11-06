import { ecrireAtomiquement, genreDeVideo } from "../film-fichiers-deposes";
import { raisonDuRefus, type ClientFal } from "./seedance";

/**
 * Le client Kling (Kuaishou, via fal.ai) : lancer un plan, suivre sa file
 * d'attente, télécharger la vidéo. Même rôle que veo.ts/seedance.ts pour le
 * troisième fournisseur du cinéma — choisi pour le contenu dramatique que le
 * filtre de Veo refuse (violence mise en scène, visages qui ressemblent à une
 * personne réelle). Même compte fal.ai que Seedance : même clé, même
 * ClientFal.
 *
 * Deux modèles selon ce qu'on a sous la main :
 * - UNE référence (l'image fixe validée, méthode du pack de production) →
 *   v3 Pro anime ce `start_image_url` déjà composé.
 * - PLUSIEURS références (pas d'image fixe : Google la refuserait pour ce
 *   plan, c'est précisément pourquoi Kling est choisi) → O1 compose la scène
 *   lui-même depuis les portraits, référencés dans le prompt via « @ImageN ».
 *   Pas d'audio dans ce mode (testé : O1 n'en génère aucun).
 *
 * Les deux variantes partagent le même suivi (statut ET résultat), sous le
 * chemin COURT de l'app — la variante lancée répond 405 sur /status, quelle
 * que soit la méthode.
 */
export const MODELE_KLING_V3 = "fal-ai/kling-video/v3/pro/image-to-video";
export const MODELE_KLING_O1 = "fal-ai/kling-video/o1/reference-to-video";
const SUIVI_KLING = "fal-ai/kling-video";

export type ImageDeReference = { octets: Uint8Array; mimeType: "image/jpeg" | "image/png" };
export type DemandeDePlanKling = { prompt: string; negatif?: string; references?: ImageDeReference[] };

function versDataUri(image: ImageDeReference): string {
  return `data:${image.mimeType};base64,${Buffer.from(image.octets).toString("base64")}`;
}

/** Quel modèle Kling pour cette demande, et son corps de requête. */
export function appelDeLancement(demande: DemandeDePlanKling): { modele: string; corps: unknown } {
  const references = demande.references ?? [];
  if (references.length <= 1) {
    const image = references[0];
    return {
      modele: MODELE_KLING_V3,
      corps: {
        prompt: demande.prompt,
        ...(demande.negatif ? { negative_prompt: demande.negatif } : {}),
        ...(image ? { start_image_url: versDataUri(image) } : {}),
        // Muet : la voix se génère à part (Voicebox, par personnage) et se
        // cale au montage — pas de synthèse Kling (risque de traduction en
        // anglais sur une réplique française, payée pour rien si jetée).
        generate_audio: false,
        duration: "8",
      },
    };
  }
  const image_urls = references.map(versDataUri);
  const tags = image_urls.map((_, i) => `@Image${i + 1}`).join(", ");
  const prefixe = `Take ${tags} as the exact approved characters/objects, in order - never redesign faces, skin tone, hair, age or object design. `;
  // 2500 caractères au plus chez Kling (contre aucune limite pratique chez
  // Veo) : composerLePrompt écrit pour Veo, avec la description complète de
  // chaque référence — on coupe large ici plutôt que de refuser le plan.
  // Marge de sécurité : leur compteur semble strictement en octets, pas en
  // caractères JS (un tiret cadratin « — » en fait 3 à lui seul).
  const LIMITE = 2300;
  const prompt = (prefixe + demande.prompt).slice(0, LIMITE);
  return { modele: MODELE_KLING_O1, corps: { prompt, image_urls, duration: "6", aspect_ratio: "9:16" } };
}

export type Lancement = { ok: true; operation: string } | { ok: false; statut: number; raison: string };
export type Suivi =
  | { etat: "en-cours" }
  | { etat: "pret"; uri: string }
  | { etat: "refuse"; raison: string }
  // Réseau coupé ou fal.ai en panne : la génération continue peut-être, on ne l'abandonne pas.
  | { etat: "injoignable"; raison: string };

async function lireJson(reponse: Response): Promise<unknown> {
  try {
    return await reponse.json();
  } catch {
    return null;
  }
}

export async function lancerUnPlan(client: ClientFal, demande: DemandeDePlanKling): Promise<Lancement> {
  const { modele, corps: corpsAEnvoyer } = appelDeLancement(demande);
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/${modele}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${client.cle}` },
      body: JSON.stringify(corpsAEnvoyer),
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
 * Même prudence que Seedance : un statut COMPLETED dont la relecture du
 * résultat échoue AUTREMENT qu'un refus explicite (502/503/429 passagers)
 * reste « injoignable » pour être retenté — jamais perdu après facturation.
 */
export async function suivreUnPlan(client: ClientFal, requestId: string): Promise<Suivi> {
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/${SUIVI_KLING}/requests/${requestId}/status`, { headers: { Authorization: `Key ${client.cle}` } });
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
    resultat = await fetch(`${client.base}/${SUIVI_KLING}/requests/${requestId}`, { headers: { Authorization: `Key ${client.cle}` } });
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

/** Télécharge la vidéo d'un plan prêt, UNIQUEMENT depuis un domaine de confiance. */
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
