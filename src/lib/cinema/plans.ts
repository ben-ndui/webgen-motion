import type { CinemaDuFilm, Personnage, PlanDeCinema, QualiteDeCinema, SceneDeCinema } from "../../../remotion/film/cinema/types";
import { type ReferenceDeLaSerie, referencesDeLaSerie } from "./bible/etat";

/**
 * Lire la série d'un film : retrouver un plan (et sa scène) par son id,
 * savoir qui est à l'image, et choisir le modèle de Veo. Fonctions pures.
 */
export type PlanSitue = { scene: SceneDeCinema; plan: PlanDeCinema };

export function trouverLePlan(cinema: CinemaDuFilm, planId: string): PlanSitue | null {
  for (const episode of cinema.episodes) {
    for (const scene of episode.scenes) {
      const plan = scene.plans.find((candidat) => candidat.id === planId);
      if (plan) return { scene, plan };
    }
  }
  return null;
}

/** Les personnages à l'image, dans l'ordre du plan : ceux qui peuvent parler une réplique. */
export function personnagesDuPlan(cinema: CinemaDuFilm, plan: PlanDeCinema): Personnage[] {
  return plan.personnages
    .map((id) => cinema.personnages.find((personnage) => personnage.id === id))
    .filter((personnage): personnage is Personnage => personnage !== undefined);
}

/**
 * Les références (personnages OU éléments de la bible) envoyées à Veo pour ce
 * plan, dans l'ordre = l'ordre des images de référence. `plan.references`
 * prime ; absent, ce sont les personnages du plan (compat avant la bible).
 */
export function referencesDuPlan(cinema: CinemaDuFilm, plan: PlanDeCinema): ReferenceDeLaSerie[] {
  const ids = plan.references ?? plan.personnages;
  const toutes = referencesDeLaSerie(cinema);
  return ids.map((id) => toutes.find((reference) => reference.id === id)).filter((reference): reference is ReferenceDeLaSerie => reference !== undefined);
}

export type ChoixDuModele = { fournisseur: "veo"; qualite: QualiteDeCinema; pourquoi: string } | { fournisseur: "seedance"; pourquoi: string };

/** La photo du vrai produit part en référence dans ce plan. */
export function photoDuProduitDansLePlan(cinema: CinemaDuFilm, plan: PlanDeCinema): boolean {
  return plan.objet && cinema.photoDeLObjet !== undefined;
}

/**
 * Lite refuse les images de référence (recette réelle du 14/10) : dès qu'une
 * référence ou la photo du produit est à l'image, seul Fast les respecte.
 * Un plan confié à Seedance (choix explicite, `plan.fournisseur`) n'a pas
 * cette distinction : un seul modèle, jusqu'à 30 images de référence.
 */
export function choisirLeModele(cinema: CinemaDuFilm, plan: PlanDeCinema): ChoixDuModele {
  if (plan.fournisseur === "seedance") {
    return { fournisseur: "seedance", pourquoi: "Choisi pour ce plan : audio natif, facturé au token chez fal.ai." };
  }
  const presentes = referencesDuPlan(cinema, plan);
  if (presentes.length === 0 && photoDuProduitDansLePlan(cinema, plan)) {
    return { fournisseur: "veo", qualite: "fast", pourquoi: "La photo du vrai produit est envoyée : Fast la respecte." };
  }
  if (presentes.length === 0) return { fournisseur: "veo", qualite: "lite", pourquoi: "Aucune référence à l'image : le modèle Lite suffit." };
  const noms = presentes.map((reference) => reference.nom).join(" et ");
  return { fournisseur: "veo", qualite: "fast", pourquoi: `${noms} ${presentes.length > 1 ? "sont" : "est"} à l'image : Fast garde le même visage.` };
}
