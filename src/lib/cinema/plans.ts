import type { CinemaDuFilm, Personnage, PlanDeCinema, QualiteDeCinema, SceneDeCinema } from "../../../remotion/film/cinema/types";

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

/** Les personnages à l'image, dans l'ordre du plan (= l'ordre des portraits envoyés à Veo). */
export function personnagesDuPlan(cinema: CinemaDuFilm, plan: PlanDeCinema): Personnage[] {
  return plan.personnages
    .map((id) => cinema.personnages.find((personnage) => personnage.id === id))
    .filter((personnage): personnage is Personnage => personnage !== undefined);
}

export type ChoixDuModele = { qualite: QualiteDeCinema; pourquoi: string };

/**
 * Lite refuse les portraits en référence (recette réelle du 14/10) : dès
 * qu'un personnage est à l'image, seul Fast le garde identique.
 */
export function choisirLeModele(cinema: CinemaDuFilm, plan: PlanDeCinema): ChoixDuModele {
  const presents = personnagesDuPlan(cinema, plan);
  if (presents.length === 0) return { qualite: "lite", pourquoi: "Aucun personnage à l'image : le modèle Lite suffit." };
  const noms = presents.map((personnage) => personnage.nom).join(" et ");
  return { qualite: "fast", pourquoi: `${noms} ${presents.length > 1 ? "sont" : "est"} à l'image : Fast garde le même visage.` };
}
