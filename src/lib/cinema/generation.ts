import { existsSync } from "node:fs";
import { join } from "node:path";

import { estUnExemple } from "../../../remotion/film/cinema/exemples";
import { BUDGET_PAR_DEFAUT } from "../../../remotion/film/cinema/validerCinema";
import type { CinemaDuFilm, PlanDeCinema, QualiteDeCinema, SceneDeCinema } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { lireLaBible } from "./bible/stockage";
import { portraitsPourVeo } from "./generation-portrait";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, SANS_CLE, ficheAvecCinema } from "./lieux";
import { choisirLeModele, photoDuProduitDansLePlan, referencesDuPlan, trouverLePlan } from "./plans";
import { cheminDeLaPrise, prisesDuPlan, prochainNumeroDePrise } from "./prises/etat";
import { ajouterUnePrise, retenirUnePrise } from "./prises/gestes";
import { lireLesPrises } from "./prises/stockage";
import { composerLePrompt } from "./prompt";
import { annulerSansFrais, lireLeRegistre, noterLeLancement, reserver, terminer } from "./registre";
import { COUT_D_UN_PLAN_USD } from "./couts";
import { lancerUnPlan, suivreUnPlan, telechargerLePlan } from "./veo";

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
// Le modèle que GEN MOTION a choisi pour CE plan, et ce qu'il coûte : affiché avant le clic.
export type ModeleDuPlan = { qualite: QualiteDeCinema; pourquoi: string; coutUsd: number };

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
      modele: { ...choix, coutUsd: COUT_D_UN_PLAN_USD[choix.qualite] },
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

export async function genererUnPlan(id: string, planId: string, partiel: Partial<Lieux> = {}): Promise<ReponseDuPlan> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = lireLeContexte(id, planId, lieux);
  if (!lecture.ok) return lecture;
  const contexte = lecture.contexte;
  const client = lieux.veo();
  if (!client) return SANS_CLE;
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
  const lancement = await lancerUnPlan(client, { qualite: contexte.modele.qualite, ...prompt, references: portraits.references });
  if (!lancement.ok) {
    annulerSansFrais(dossier, planId);
    return { ok: false, statut: 502, raison: `${lancement.raison} Rien n'a été facturé.` };
  }
  noterLeLancement(dossier, planId, lancement.operation, photo !== undefined);
  return repondre(id, contexte, { etat: "en-cours" }, lieux);
}

export async function suivreLePlan(id: string, planId: string, partiel: Partial<Lieux> = {}, maintenant: number = Date.now()): Promise<ReponseDuPlan> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = lireLeContexte(id, planId, lieux);
  if (!lecture.ok) return lecture;
  const contexte = lecture.contexte;
  const dossier = lieux.dossier(id);
  const operation = lireLeRegistre(dossier).operations[planId];
  if (!operation) return repondre(id, contexte, etatDuFichier(contexte.plan, lieux.public(id)), lieux);
  // Réservé mais pas encore accepté par Google : le lancement est en vol.
  if (operation.nom === null) return repondre(id, contexte, { etat: "en-cours" }, lieux);
  const client = lieux.veo();
  if (!client) return SANS_CLE;

  const suivi = await suivreUnPlan(client, operation.nom);
  if (suivi.etat === "en-cours" || suivi.etat === "injoignable") return repondre(id, contexte, suivi, lieux);
  if (suivi.etat === "refuse") {
    annulerSansFrais(dossier, planId);
    return repondre(id, contexte, { etat: "refuse", raison: `${suivi.raison} Rien n'a été facturé.` }, lieux);
  }
  const n = prochainNumeroDePrise(prisesDuPlan(lireLesPrises(dossier), contexte.plan));
  const fichier = cheminDeLaPrise(planId, n);
  if (!(await telechargerLePlan(client, suivi.uri, join(lieux.public(id), fichier)))) {
    if (maintenant - Date.parse(operation.depuis) > VIDEO_GARDEE_PAR_GOOGLE_MS) {
      terminer(dossier, planId);
      return repondre(id, contexte, { etat: "refuse", raison: "La vidéo a expiré chez Google (gardée 48 h) avant d'être téléchargée. Ce plan a été facturé : relance-le pour en obtenir un nouveau." }, lieux);
    }
    // L'opération reste notée : le prochain passage retente le téléchargement.
    return repondre(id, contexte, { etat: "injoignable", raison: "La vidéo est prête chez Google mais le téléchargement a échoué : nouvel essai au prochain passage." }, lieux);
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
