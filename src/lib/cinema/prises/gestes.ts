import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import type { DecoupeDuPlan, PlanDeCinema } from "../../../../remotion/film/cinema/types";
import { enregistrerFilm } from "../../film-ecriture";
import { chargerFilm } from "../../film-loader";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus } from "../lieux";
import { trouverLePlan } from "../plans";
import { type Prise, cheminDeLaPrise, prisesDuPlan } from "./etat";
import { lireLesPrises, modifierLesPrises } from "./stockage";

/**
 * Lister, retenir et supprimer les prises d'un plan, et y ajouter celle que
 * Veo vient de rendre. La fiche est relue SOUS le verrou des prises juste
 * avant d'écrire : seul ce plan change. SERVEUR SEULEMENT.
 */
export type PriseALEcran = Prise & { retenue: boolean; presente: boolean };
export type CeQueCiteLePlan = Pick<PlanDeCinema, "fichier" | "decoupe" | "produitReel">;
export type ReponseDesPrises = { ok: true; prises: PriseALEcran[]; plan: CeQueCiteLePlan } | Refus;

type PlanLu = { ok: true; plan: PlanDeCinema; enregistrer: () => boolean } | Refus;

// La fiche d'aujourd'hui, et de quoi la réécrire après avoir touché à ce plan.
function lireLePlan(id: string, planId: string, lieux: Lieux): PlanLu {
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };
  if (!fiche.spec.cinema) return { ok: false, statut: 400, raison: "Ce film n'a pas encore de série." };
  const situe = trouverLePlan(fiche.spec.cinema, planId);
  if (!situe) return { ok: false, statut: 404, raison: `Le plan « ${planId} » n'existe pas dans ce film.` };
  return { ok: true, plan: situe.plan, enregistrer: () => enregistrerFilm(id, fiche.spec, lieux.fiches).ok };
}

function aLEcran(prises: Prise[], plan: PlanDeCinema, dossierPublic: string): ReponseDesPrises {
  const liste = prises.map((prise) => ({ ...prise, retenue: prise.fichier === plan.fichier, presente: existsSync(join(dossierPublic, prise.fichier)) }));
  return { ok: true, prises: liste, plan: { fichier: plan.fichier, decoupe: plan.decoupe, produitReel: plan.produitReel } };
}

function poserLaDecoupe(cible: { decoupe?: DecoupeDuPlan }, decoupe: DecoupeDuPlan | undefined): void {
  if (decoupe) cible.decoupe = decoupe;
  else delete cible.decoupe;
}

export function lesPrisesDuPlan(id: string, planId: string, partiel: Partial<Lieux> = {}): ReponseDesPrises {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lu = lireLePlan(id, planId, lieux);
  if (!lu.ok) return lu;
  return aLEcran(prisesDuPlan(lireLesPrises(lieux.dossier(id)), lu.plan), lu.plan, lieux.public(id));
}

/**
 * Range la prise que Veo vient de rendre. Elle n'est retenue que si le plan
 * n'en avait aucune : une nouvelle prise se regarde avant de remplacer celle
 * qui passe dans l'épisode. Rejouée (téléchargement retenté), elle ne
 * duplique rien.
 */
export function ajouterUnePrise(id: string, planId: string, prise: Prise, lieux: Lieux): { ok: true; retenue: boolean } | { ok: false } {
  return modifierLesPrises(lieux.dossier(id), (registre) => {
    const lu = lireLePlan(id, planId, lieux);
    if (!lu.ok) return { ok: false } as const;
    const prises = prisesDuPlan(registre, lu.plan);
    if (!prises.some((connue) => connue.n === prise.n)) prises.push(prise);
    registre.plans[planId] = prises;
    if (lu.plan.fichier) return { ok: true, retenue: false } as const;
    lu.plan.fichier = prise.fichier;
    if (prise.produitReel) lu.plan.produitReel = true;
    else delete lu.plan.produitReel;
    delete lu.plan.decoupe;
    return lu.enregistrer() ? ({ ok: true, retenue: true } as const) : ({ ok: false } as const);
  });
}

/** Fait passer la prise `n` dans l'épisode ; chaque prise garde sa propre découpe. */
export function retenirUnePrise(id: string, planId: string, n: number, partiel: Partial<Lieux> = {}): ReponseDesPrises {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  return modifierLesPrises(lieux.dossier(id), (registre): ReponseDesPrises => {
    const lu = lireLePlan(id, planId, lieux);
    if (!lu.ok) return lu;
    const prises = prisesDuPlan(registre, lu.plan);
    registre.plans[planId] = prises;
    const cible = prises.find((prise) => prise.n === n);
    if (!cible) return { ok: false, statut: 404, raison: `La prise ${n} n'existe pas pour ce plan.` };
    if (!existsSync(join(lieux.public(id), cible.fichier))) return { ok: false, statut: 409, raison: `La vidéo de la prise ${n} manque sur le disque : elle ne peut pas passer dans l'épisode.` };
    if (cible.fichier === lu.plan.fichier) return aLEcran(prises, lu.plan, lieux.public(id));
    // La découpe de la prise qui sort est gardée avec elle, celle qui entre revient.
    const sortante = prises.find((prise) => prise.fichier === lu.plan.fichier);
    if (sortante) poserLaDecoupe(sortante, lu.plan.decoupe);
    lu.plan.fichier = cible.fichier;
    poserLaDecoupe(lu.plan, cible.decoupe);
    if (cible.produitReel) lu.plan.produitReel = true;
    else delete lu.plan.produitReel;
    if (!lu.enregistrer()) return { ok: false, statut: 409, raison: "La fiche n'a pas pu être mise à jour : réessaie." };
    return aLEcran(prises, lu.plan, lieux.public(id));
  });
}

/** Supprime une prise et sa vidéo ; jamais la retenue (l'épisode n'aurait plus ce plan). */
export function supprimerUnePrise(id: string, planId: string, n: number, partiel: Partial<Lieux> = {}): ReponseDesPrises {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  return modifierLesPrises(lieux.dossier(id), (registre): ReponseDesPrises => {
    const lu = lireLePlan(id, planId, lieux);
    if (!lu.ok) return lu;
    const prises = prisesDuPlan(registre, lu.plan);
    const cible = prises.find((prise) => prise.n === n);
    if (!cible) return { ok: false, statut: 404, raison: `La prise ${n} n'existe pas pour ce plan.` };
    if (cible.fichier === lu.plan.fichier) {
      return { ok: false, statut: 409, raison: "C'est la prise retenue : retiens-en une autre avant de la supprimer." };
    }
    registre.plans[planId] = prises.filter((prise) => prise.n !== n);
    // Seul un chemin que GEN MOTION a pu écrire pour CE plan s'efface.
    if (cible.fichier === cheminDeLaPrise(planId, n) || cible.fichier === `cinema/${planId}.mp4`) {
      rmSync(join(lieux.public(id), cible.fichier), { force: true });
    }
    return aLEcran(registre.plans[planId], lu.plan, lieux.public(id));
  });
}
