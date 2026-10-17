import { join } from "node:path";

import type { KaraokeSpec } from "../../../remotion/film/karaoke/spec";
import { paletteEnMots } from "../cinema/couleurs";
import { COUT_D_UN_PLAN_USD } from "../cinema/couts";
import { annulerSansFrais, lireLeRegistre, noterLeLancement, reserver, terminer } from "../cinema/registre";
import { API_VEO, type ClientVeo, lancerUnPlan, suivreUnPlan, telechargerLePlan } from "../cinema/veo";
import { resolveVeoKey } from "../config-resolve";
import { chargerProjet, enregistrerProjet, lireProjetBrut } from "./format-loader";
import { getFormatPublicDir, getFormatsDir } from "./format-store";

/**
 * Le décor « sur mesure » d'un karaoké : la description de l'artiste devient une
 * vidéo Veo de 8 s, qui boucle sur tout le morceau. SERVEUR SEULEMENT.
 * Méthode et pièges repris de la série (cinema/) : réservation AVANT l'appel,
 * reprise après rechargement sans repayer, téléchargement vérifié.
 * Veo LITE : un décor n'a ni personnage ni photo de produit (0,64 $ les 8 s en 1080p).
 */

export type Version = "long" | "court";
export const PLAFOND_DE_FONDS = 6;
export const COUT_D_UN_FOND_USD = COUT_D_UN_PLAN_USD.lite;
const NEGATIF = "text, letters, words, subtitles, logo, watermark, recognizable faces in close-up, sudden cuts, flashing";

export type Lieux = { fiches: string; dossier: (id: string) => string; public: (id: string) => string; veo: () => ClientVeo | null };
const LIEUX: Lieux = {
  fiches: getFormatsDir(),
  dossier: (id) => join(getFormatPublicDir(id), ".."),
  public: getFormatPublicDir,
  veo: () => {
    const cle = resolveVeoKey();
    return cle ? { base: API_VEO, cle } : null;
  },
};

export type Refus = { ok: false; statut: 400 | 404 | 409 | 412 | 502; raison: string };

/** Le prompt (en anglais : Veo le suit mieux) : la description de l'artiste, sa palette, et ce qui fait une bonne boucle. */
export function promptDuFond(spec: KaraokeSpec, version: Version): string {
  const { couleurs } = spec.marque;
  return [
    `Seamless looping ${version === "court" ? "vertical" : "widescreen"} background video for a music lyric video.`,
    `Scene: ${spec.fond?.description.trim()}`,
    `Color palette: ${paletteEnMots([couleurs.encre, couleurs.accent, couleurs.clair])}.`,
    "Slow, continuous, ambient motion that can loop without a visible cut. Static camera or very slow drift.",
    "Leave the lower third calm and darker: lyrics will be displayed there.",
  ].join(" ");
}

function karaoke(id: string, lieux: Lieux): { ok: true; spec: KaraokeSpec } | Refus {
  const projet = chargerProjet(id, lieux.fiches);
  if (!projet) return { ok: false, statut: 404, raison: "Projet introuvable" };
  if (projet.etat === "invalide") return { ok: false, statut: 409, raison: `Le projet a des erreurs : ${projet.erreurs[0]}` };
  if (projet.fiche.format !== "karaoke") return { ok: false, statut: 409, raison: "Ce projet n'est pas un karaoké." };
  if (projet.fiche.spec.decor !== "sur-mesure" || !projet.fiche.spec.fond?.description.trim()) {
    return { ok: false, statut: 400, raison: "Décris d'abord ton décor." };
  }
  return { ok: true, spec: projet.fiche.spec };
}

/** Lance la génération du décor d'un format. Réservé AVANT l'appel : deux clics ne paient pas deux fois. */
export async function lancerLeFond(id: string, version: Version, partiel: Partial<Lieux> = {}): Promise<{ ok: true; coutUsd: number } | Refus> {
  const lieux = { ...LIEUX, ...partiel };
  const lecture = karaoke(id, lieux);
  if (!lecture.ok) return lecture;
  const client = lieux.veo();
  if (!client) return { ok: false, statut: 412, raison: "Aucune clé Google (Veo) : ajoute-la dans Réglages › Vidéo IA." };
  const planId = `fond-${version}`;
  const reservation = reserver(lieux.dossier(id), planId, PLAFOND_DE_FONDS);
  if (!reservation.ok) {
    return reservation.raison === "en-cours"
      ? { ok: false, statut: 409, raison: "Ce décor est déjà en cours de génération." }
      : { ok: false, statut: 409, raison: `Plafond atteint : ${PLAFOND_DE_FONDS} décors générés pour ce projet.` };
  }
  const lancement = await lancerUnPlan(client, { qualite: "lite", prompt: promptDuFond(lecture.spec, version), negatif: NEGATIF, format: version === "court" ? "9:16" : "16:9" });
  if (!lancement.ok) {
    annulerSansFrais(lieux.dossier(id), planId);
    return { ok: false, statut: 502, raison: `${lancement.raison} Rien n'a été facturé.` };
  }
  noterLeLancement(lieux.dossier(id), planId, lancement.operation);
  return { ok: true, coutUsd: COUT_D_UN_FOND_USD };
}

export type EtatDuFond = { etat: "aucun" | "en-cours" | "pret"; video?: string } | { etat: "refuse"; raison: string };

/**
 * Un pas de suivi : demande à Google où en est la génération, et range la
 * vidéo prête dans le projet (champ SERVEUR, que l'éditeur ne peut pas écrire).
 */
export async function suivreLeFond(id: string, version: Version, partiel: Partial<Lieux> = {}): Promise<EtatDuFond | Refus> {
  const lieux = { ...LIEUX, ...partiel };
  const operation = lireLeRegistre(lieux.dossier(id)).operations[`fond-${version}`];
  const projet = lireProjetBrut(id, lieux.fiches) as { format?: string; spec?: KaraokeSpec } | null;
  if (!projet) return { ok: false, statut: 404, raison: "Projet introuvable" };
  const deja = projet.spec?.fond?.videos[version];
  if (!operation) return deja ? { etat: "pret", video: deja } : { etat: "aucun" };
  if (!operation.nom) return { etat: "en-cours" };
  const client = lieux.veo();
  if (!client) return { ok: false, statut: 412, raison: "Aucune clé Google (Veo) : ajoute-la dans Réglages › Vidéo IA." };
  const suivi = await suivreUnPlan(client, operation.nom);
  if (suivi.etat === "en-cours" || suivi.etat === "injoignable") return { etat: "en-cours" };
  if (suivi.etat === "refuse") {
    // Google ne facture pas ce qu'il refuse (filtre de contenu) : le décor ne compte pas au plafond.
    annulerSansFrais(lieux.dossier(id), `fond-${version}`);
    return { etat: "refuse", raison: suivi.raison };
  }
  const relatif = `fond/${version}-${Date.now()}.mp4`;
  if (!(await telechargerLePlan(client, suivi.uri, join(lieux.public(id), relatif)))) return { etat: "en-cours" };
  const fiche = lireProjetBrut(id, lieux.fiches) as { format: "karaoke"; spec: KaraokeSpec };
  fiche.spec.fond = { description: fiche.spec.fond?.description ?? "", videos: { ...fiche.spec.fond?.videos, [version]: relatif } };
  enregistrerProjet(id, fiche, lieux.fiches, { videosDuServeur: true });
  terminer(lieux.dossier(id), `fond-${version}`);
  return { etat: "pret", video: relatif };
}
