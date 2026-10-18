import { existsSync } from "node:fs";
import { join } from "node:path";

import { estUnExemple } from "../../../remotion/film/cinema/exemples";
import { BUDGET_PAR_DEFAUT } from "../../../remotion/film/cinema/validerCinema";
import type { CinemaDuFilm, FournisseurDeCinema, PlanDeCinema, SceneDeCinema } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { lireLaBible } from "./bible/stockage";
import { coutDuModele } from "./couts";
import { portraitsPourVeo } from "./generation-portrait";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, SANS_CLE, SANS_CLE_FAL, ficheAvecCinema } from "./lieux";
import { type ChoixDuModele, choisirLeModele, photoDuProduitDansLePlan, referencesDuPlan, trouverLePlan } from "./plans";
import { cheminDeLaPrise, prisesDuPlan, prochainNumeroDePrise } from "./prises/etat";
import { ajouterUnePrise, retenirUnePrise } from "./prises/gestes";
import { lireLesPrises } from "./prises/stockage";
import { composerLePrompt } from "./prompt";
import { annulerSansFrais, lireLeRegistre, noterLeLancement, reserver, terminer } from "./registre";
import {
  type ClientFal,
  type Suivi,
  lancerUnPlan as lancerUnPlanSeedance,
  suivreUnPlan as suivreUnPlanSeedance,
  telechargerLePlan as telechargerLePlanSeedance,
} from "./seedance";
import { type ClientVeo, lancerUnPlan as lancerUnPlanVeo, suivreUnPlan as suivreUnPlanVeo, telechargerLePlan as telechargerLePlanVeo } from "./veo";

/**
 * Générer un plan de la série, et le suivre jusqu'à son fichier. Chaque appel
 * fait UN pas (lancer, ou relire l'opération une fois) : la page interroge
 * toutes les quelques secondes, et un rechargement reprend la même opération
 * chez Google au lieu d'en payer une nouvelle. SERVEUR SEULEMENT.
 */
export type EtatDuPlan =
  | { etat: "vide" }
  | { etat: "en-cours" }
  | { etat: "pret"; fichier: string }
  | { etat: "refuse"; raison: string }
  | { etat: "injoignable"; raison: string };

export type Budget = { utilises: number; plafond: number };
// Le modèle que GEN MOTION a choisi pour CE plan, et ce qu'il coûte : affiché
// avant le clic. coutUsd null : Seedance facture au token, pas de prix fixe connu.
export type ModeleDuPlan = ChoixDuModele & { coutUsd: number | null };

export type ReponseDuPlan = { ok: true; plan: EtatDuPlan; budget: Budget; modele: ModeleDuPlan } | Refus;

// Google garde la vidéo d'un plan 48 h. Au-delà, le téléchargement ne peut
// plus réussir : on clôt l'opération au lieu de la retenter pour toujours.
export const VIDEO_GARDEE_PAR_GOOGLE_MS = 47 * 3_600_000;

type Contexte = { spec: FilmSpec; cinema: CinemaDuFilm; scene: SceneDeCinema; plan: PlanDeCinema; modele: ModeleDuPlan; plafond: number };

function lireLeContexte(id: string, planId: string, lieux: Lieux): { ok: true; contexte: Contexte } | Refus {
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const situe = trouverLePlan(lecture.cinema, planId);
  if (!situe) return { ok: false, statut: 404, raison: `Le plan « ${planId} » n'existe pas dans ce film.` };
  const choix = choisirLeModele(lecture.cinema, situe.plan);
  return {
    ok: true,
    contexte: {
      spec: lecture.spec,
      cinema: lecture.cinema,
      scene: situe.scene,
      plan: situe.plan,
      modele: { ...choix, coutUsd: coutDuModele(choix) },
      plafond: lecture.cinema.budget ?? BUDGET_PAR_DEFAUT,
    },
  };
}

function repondre(id: string, contexte: Contexte, plan: EtatDuPlan, lieux: Lieux): ReponseDuPlan {
  const budget = { utilises: lireLeRegistre(lieux.dossier(id)).utilises, plafond: contexte.plafond };
  return { ok: true, plan, budget, modele: contexte.modele };
}

// Un plan généré sur un texte d'exemple serait payé pour rien : on le dit
// AVANT de réserver le budget.
function texteEncoreDExemple(contexte: Contexte): string | null {
  if (estUnExemple("decor", contexte.scene.decor)) return "Décris d'abord le décor de la scène : c'est encore l'exemple.";
  if (estUnExemple("consigne", contexte.plan.consigne)) return "Écris d'abord ce qui se passe dans ce plan : c'est encore l'exemple.";
  const flou = referencesDuPlan(contexte.cinema, contexte.plan).find((r) => estUnExemple("description", r.description));
  return flou ? `Décris d'abord ${flou.nom} : sa description est encore l'exemple.` : null;
}

// « Prêt » se juge sur le DISQUE : une fiche peut citer une vidéo effacée ou
// jamais arrivée, et l'écran annoncerait un plan qui n'existe pas.
function etatDuFichier(plan: PlanDeCinema, dossierPublic: string): EtatDuPlan {
  if (plan.fichier && existsSync(join(dossierPublic, plan.fichier))) return { etat: "pret", fichier: plan.fichier };
  return { etat: "vide" };
}

type Lancement = { ok: true; operation: string } | { ok: false; statut: number; raison: string };
type ImageDeReference = { octets: Uint8Array; mimeType: "image/jpeg" | "image/png" };

// Le lancement proprement dit, une fois le budget réservé : le seul endroit
// qui sait parler à Veo OU à Seedance. Le modèle vient du choix fait sur le
// plan (choisirLeModele), jamais redérivé après coup.
async function lancerLaGeneration(modele: ModeleDuPlan, lieux: Lieux, prompt: { prompt: string; negatif: string }, references: ImageDeReference[]): Promise<Lancement> {
  if (modele.fournisseur === "seedance") {
    const client = lieux.fal();
    if (!client) return { ok: false, statut: 412, raison: SANS_CLE_FAL.raison };
    return lancerUnPlanSeedance(client, { prompt: prompt.prompt, negatif: prompt.negatif, references });
  }
  const client = lieux.veo();
  if (!client) return { ok: false, statut: 412, raison: SANS_CLE.raison };
  return lancerUnPlanVeo(client, { qualite: modele.qualite, ...prompt, references });
}

export async function genererUnPlan(id: string, planId: string, partiel: Partial<Lieux> = {}): Promise<ReponseDuPlan> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = lireLeContexte(id, planId, lieux);
  if (!lecture.ok) return lecture;
  const contexte = lecture.contexte;
  const modele = contexte.modele;
  if (modele.fournisseur === "veo" && !lieux.veo()) return SANS_CLE;
  if (modele.fournisseur === "seedance" && !lieux.fal()) return SANS_CLE_FAL;
  const texteDExemple = texteEncoreDExemple(contexte);
  if (texteDExemple) return { ok: false, statut: 400, raison: texteDExemple };
  const photo = photoDuProduitDansLePlan(contexte.cinema, contexte.plan) ? contexte.cinema.photoDeLObjet : undefined;
  const dossier = lieux.dossier(id);
  const portraits = portraitsPourVeo(referencesDuPlan(contexte.cinema, contexte.plan), lieux.public(id), lireLaBible(dossier), photo);
  if (!portraits.ok) return portraits;

  const reservation = reserver(dossier, planId, contexte.plafond);
  if (!reservation.ok && reservation.raison === "en-cours") return repondre(id, contexte, { etat: "en-cours" }, lieux);
  if (!reservation.ok) {
    return { ok: false, statut: 409, raison: `Budget atteint : ${reservation.utilises} plans sur ${contexte.plafond}. Augmente le budget du film pour continuer.` };
  }
  const prompt = composerLePrompt(contexte.spec, contexte.scene, contexte.plan);
  const lancement = await lancerLaGeneration(modele, lieux, prompt, portraits.references);
  if (!lancement.ok) {
    annulerSansFrais(dossier, planId);
    return { ok: false, statut: 502, raison: `${lancement.raison} Rien n'a été facturé.` };
  }
  noterLeLancement(dossier, planId, lancement.operation, modele.fournisseur, photo !== undefined);
  return repondre(id, contexte, { etat: "en-cours" }, lieux);
}

const NOM_DU_FOURNISSEUR: Record<FournisseurDeCinema, string> = { veo: "Google", seedance: "fal.ai" };

type AccesFournisseur = { ok: true; suivre: () => Promise<Suivi>; telecharger: (uri: string, destination: string) => Promise<boolean> } | Refus;

// Le suivi ET le téléchargement se font avec le fournisseur du LANCEMENT
// (operation.fournisseur), jamais celui choisi aujourd'hui sur le plan :
// il a pu changer entre-temps, ça ne concerne pas cette opération en vol.
function accesAuFournisseur(fournisseur: FournisseurDeCinema, lieux: Lieux, operationNom: string): AccesFournisseur {
  if (fournisseur === "seedance") {
    const client: ClientFal | null = lieux.fal();
    if (!client) return SANS_CLE_FAL;
    return { ok: true, suivre: () => suivreUnPlanSeedance(client, operationNom), telecharger: (uri, destination) => telechargerLePlanSeedance(client, uri, destination) };
  }
  const client: ClientVeo | null = lieux.veo();
  if (!client) return SANS_CLE;
  return { ok: true, suivre: () => suivreUnPlanVeo(client, operationNom), telecharger: (uri, destination) => telechargerLePlanVeo(client, uri, destination) };
}

export async function suivreLePlan(id: string, planId: string, partiel: Partial<Lieux> = {}, maintenant: number = Date.now()): Promise<ReponseDuPlan> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = lireLeContexte(id, planId, lieux);
  if (!lecture.ok) return lecture;
  const contexte = lecture.contexte;
  const dossier = lieux.dossier(id);
  const operation = lireLeRegistre(dossier).operations[planId];
  if (!operation) return repondre(id, contexte, etatDuFichier(contexte.plan, lieux.public(id)), lieux);
  // Réservé mais pas encore accepté : le lancement est en vol.
  if (operation.nom === null) return repondre(id, contexte, { etat: "en-cours" }, lieux);
  const fournisseur = operation.fournisseur ?? "veo";
  const acces = accesAuFournisseur(fournisseur, lieux, operation.nom);
  if (!acces.ok) return acces;
  const nomDuFournisseur = NOM_DU_FOURNISSEUR[fournisseur];

  const suivi = await acces.suivre();
  if (suivi.etat === "en-cours" || suivi.etat === "injoignable") return repondre(id, contexte, suivi, lieux);
  if (suivi.etat === "refuse") {
    annulerSansFrais(dossier, planId);
    return repondre(id, contexte, { etat: "refuse", raison: `${suivi.raison} Rien n'a été facturé.` }, lieux);
  }
  const n = prochainNumeroDePrise(prisesDuPlan(lireLesPrises(dossier), contexte.plan));
  const fichier = cheminDeLaPrise(planId, n);
  if (!(await acces.telecharger(suivi.uri, join(lieux.public(id), fichier)))) {
    if (maintenant - Date.parse(operation.depuis) > VIDEO_GARDEE_PAR_GOOGLE_MS) {
      terminer(dossier, planId);
      return repondre(id, contexte, { etat: "refuse", raison: `La vidéo a expiré chez ${nomDuFournisseur} avant d'être téléchargée. Ce plan a été facturé : relance-le pour en obtenir un nouveau.` }, lieux);
    }
    // L'opération reste notée : le prochain passage retente le téléchargement.
    return repondre(id, contexte, { etat: "injoignable", raison: `La vidéo est prête chez ${nomDuFournisseur} mais le téléchargement a échoué : nouvel essai au prochain passage.` }, lieux);
  }
  const prise = { n, fichier, creeeLe: new Date(maintenant).toISOString(), ...(operation.avecLaPhotoDuProduit ? { produitReel: true as const } : {}) };
  const ajout = ajouterUnePrise(id, planId, prise, lieux);
  // Une prise de plus qu'une déjà retenue se regarde avant de remplacer : tant
  // que l'écran de choix n'existe pas, on la retient tout de suite (même
  // comportement qu'avant les prises multiples). Sa découpe tombe : elle
  // visait l'ancienne vidéo.
  const cite = ajout.ok && !ajout.retenue ? retenirUnePrise(id, planId, n, lieux) : ajout;
  if (!cite.ok) {
    // L'opération reste notée : elle se re-télécharge (gratuitement) au
    // prochain passage, une fois la fiche réparée. Sinon ce plan payé
    // s'afficherait « vide ».
    return { ok: false, statut: 409, raison: `La vidéo est arrivée (${fichier}) mais la fiche n'a pas pu la citer : corrige ses erreurs, le plan se rattachera tout seul.` };
  }
  terminer(dossier, planId);
  return repondre(id, contexte, { etat: "pret", fichier }, lieux);
}
