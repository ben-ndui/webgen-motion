import { existsSync } from "node:fs";
import { join } from "node:path";

import { BUDGET_PAR_DEFAUT } from "../../../remotion/film/cinema/validerCinema";
import type { PlanDeCinema, QualiteDeCinema } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { resolveVeoKey } from "../config-resolve";
import { enregistrerFilm } from "../film-ecriture";
import { chargerFilm, getFilmsDir } from "../film-loader";
import { getFilmDir, getFilmPublicDir } from "../film-store";
import { composerLePrompt } from "./prompt";
import { annulerSansFrais, lireLeRegistre, noterLeLancement, reserver, terminer } from "./registre";
import { API_VEO, COUT_D_UN_PLAN_USD, type ClientVeo, lancerUnPlan, suivreUnPlan, telechargerLePlan } from "./veo";

/**
 * Générer un plan de cinéma, et le suivre jusqu'à son fichier. Chaque appel
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

export type Budget = { utilises: number; plafond: number; qualite: QualiteDeCinema; coutParPlanUsd: number };

export type ReponseDuPlan =
  | { ok: true; plan: EtatDuPlan; budget: Budget }
  | { ok: false; statut: 400 | 404 | 409 | 412 | 502; raison: string };

type Lieux = {
  fiches: string;
  dossier: (id: string) => string;
  public: (id: string) => string;
  // Le client Veo (réel par défaut ; un faux Google local dans les tests).
  veo: () => ClientVeo | null;
};
const LIEUX_PAR_DEFAUT: Lieux = {
  fiches: getFilmsDir(),
  dossier: getFilmDir,
  public: getFilmPublicDir,
  veo: () => {
    const cle = resolveVeoKey();
    return cle ? { base: API_VEO, cle } : null;
  },
};

type Contexte = { spec: FilmSpec; plan: PlanDeCinema; budget: Budget };

function lireLeContexte(id: string, planId: string, lieux: Lieux): { ok: true; contexte: Contexte } | (ReponseDuPlan & { ok: false }) {
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };
  const cinema = fiche.spec.cinema;
  if (!cinema) return { ok: false, statut: 400, raison: "Ce film n'a pas encore de plans de cinéma." };
  const plan = cinema.plans.find((candidat) => candidat.id === planId);
  if (!plan) return { ok: false, statut: 404, raison: `Le plan « ${planId} » n'existe pas dans ce film.` };
  const qualite = cinema.qualite ?? "fast";
  const budget: Budget = {
    utilises: lireLeRegistre(lieux.dossier(id)).utilises,
    plafond: cinema.budget ?? BUDGET_PAR_DEFAUT,
    qualite,
    coutParPlanUsd: COUT_D_UN_PLAN_USD[qualite],
  };
  return { ok: true, contexte: { spec: fiche.spec, plan, budget } };
}

function avecBudgetAJour(id: string, budget: Budget, plan: EtatDuPlan, lieux: Lieux): ReponseDuPlan {
  return { ok: true, plan, budget: { ...budget, utilises: lireLeRegistre(lieux.dossier(id)).utilises } };
}

// « Prêt » se juge sur le DISQUE : une fiche peut citer une vidéo effacée ou
// jamais arrivée, et l'écran annoncerait un plan qui n'existe pas.
function etatDuFichier(plan: PlanDeCinema, dossierPublic: string): EtatDuPlan {
  if (plan.fichier && existsSync(join(dossierPublic, plan.fichier))) return { etat: "pret", fichier: plan.fichier };
  return { etat: "vide" };
}

// Google garde la vidéo d'un plan 48 h. Au-delà, le téléchargement ne peut
// plus réussir : on clôt l'opération au lieu de la retenter pour toujours.
export const VIDEO_GARDEE_PAR_GOOGLE_MS = 47 * 3_600_000;

export async function genererUnPlan(id: string, planId: string, partiel: Partial<Lieux> = {}): Promise<ReponseDuPlan> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = lireLeContexte(id, planId, lieux);
  if (!lecture.ok) return lecture;
  const { spec, plan, budget } = lecture.contexte;
  const client = lieux.veo();
  if (!client) return { ok: false, statut: 412, raison: "Aucune clé Gemini : ajoute-la dans les Réglages pour générer des plans." };

  const dossier = lieux.dossier(id);
  const reservation = reserver(dossier, planId, budget.plafond);
  if (!reservation.ok && reservation.raison === "en-cours") return avecBudgetAJour(id, budget, { etat: "en-cours" }, lieux);
  if (!reservation.ok) {
    return { ok: false, statut: 409, raison: `Budget atteint : ${reservation.utilises} plans sur ${budget.plafond}. Augmente le budget du film pour continuer.` };
  }
  const lancement = await lancerUnPlan(client, { qualite: budget.qualite, ...composerLePrompt(spec, plan) });
  if (!lancement.ok) {
    annulerSansFrais(dossier, planId);
    return { ok: false, statut: 502, raison: `${lancement.raison} Rien n'a été facturé.` };
  }
  noterLeLancement(dossier, planId, lancement.operation);
  return avecBudgetAJour(id, budget, { etat: "en-cours" }, lieux);
}

export async function suivreLePlan(
  id: string,
  planId: string,
  partiel: Partial<Lieux> = {},
  maintenant: number = Date.now(),
): Promise<ReponseDuPlan> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = lireLeContexte(id, planId, lieux);
  if (!lecture.ok) return lecture;
  const { plan, budget } = lecture.contexte;
  const dossier = lieux.dossier(id);
  const operation = lireLeRegistre(dossier).operations[planId];
  if (!operation) return avecBudgetAJour(id, budget, etatDuFichier(plan, lieux.public(id)), lieux);
  // Réservé mais pas encore accepté par Google : le lancement est en vol.
  if (operation.nom === null) return avecBudgetAJour(id, budget, { etat: "en-cours" }, lieux);
  const client = lieux.veo();
  if (!client) return { ok: false, statut: 412, raison: "Aucune clé Gemini : ajoute-la dans les Réglages pour suivre ce plan." };

  const suivi = await suivreUnPlan(client, operation.nom);
  if (suivi.etat === "en-cours" || suivi.etat === "injoignable") return avecBudgetAJour(id, budget, suivi, lieux);
  if (suivi.etat === "refuse") {
    annulerSansFrais(dossier, planId);
    return avecBudgetAJour(id, budget, { etat: "refuse", raison: `${suivi.raison} Rien n'a été facturé.` }, lieux);
  }
  const fichier = `cinema/${planId}.mp4`;
  if (!(await telechargerLePlan(client, suivi.uri, join(lieux.public(id), fichier)))) {
    if (maintenant - Date.parse(operation.depuis) > VIDEO_GARDEE_PAR_GOOGLE_MS) {
      terminer(dossier, planId);
      return avecBudgetAJour(id, budget, { etat: "refuse", raison: "La vidéo a expiré chez Google (gardée 48 h) avant d'être téléchargée. Ce plan a été facturé : relance-le pour en obtenir un nouveau." }, lieux);
    }
    // L'opération reste notée : le prochain passage retente le téléchargement.
    return avecBudgetAJour(id, budget, { etat: "injoignable", raison: "La vidéo est prête chez Google mais le téléchargement a échoué : nouvel essai au prochain passage." }, lieux);
  }
  if (!poserLeFichier(id, planId, fichier, lieux)) {
    // L'opération reste notée : elle se re-télécharge (gratuitement) au
    // prochain passage, une fois la fiche réparée. Sinon ce plan payé
    // s'afficherait « vide ».
    return { ok: false, statut: 409, raison: `La vidéo est arrivée (${fichier}) mais la fiche n'a pas pu la citer : corrige ses erreurs, le plan se rattachera tout seul.` };
  }
  terminer(dossier, planId);
  return avecBudgetAJour(id, budget, { etat: "pret", fichier }, lieux);
}

/**
 * Cite la vidéo dans la fiche. La fiche est RELUE juste avant d'écrire : la
 * personne a pu la modifier pendant la génération (deux minutes), et seul ce
 * plan doit changer. Sa découpe tombe : elle visait l'ancienne vidéo.
 */
function poserLeFichier(id: string, planId: string, fichier: string, lieux: Lieux): boolean {
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche || fiche.etat === "invalide") return false;
  const plan = fiche.spec.cinema?.plans.find((candidat) => candidat.id === planId);
  if (!plan) return false;
  plan.fichier = fichier;
  delete plan.decoupe;
  return enregistrerFilm(id, fiche.spec, lieux.fiches).ok;
}
