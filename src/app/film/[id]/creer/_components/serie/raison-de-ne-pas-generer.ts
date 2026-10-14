import { estUnExemple } from "../../../../../../../remotion/film/cinema/exemples";
import type { CinemaDuFilm, PlanDeCinema, SceneDeCinema } from "../../../../../../../remotion/film/cinema/types";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";

/**
 * Pourquoi le bouton « Générer ce plan » est grisé, en une phrase ; `null` si
 * on peut lancer. Les mêmes refus existent côté serveur : l'écran les dit
 * AVANT le clic, le serveur les garantit.
 */
export function raisonDeNePasGenerer(
  cinema: CinemaDuFilm,
  scene: SceneDeCinema,
  plan: PlanDeCinema,
  suivi: SuiviDUnPlan | undefined,
  blocage: string | null,
): string | null {
  if (blocage) return blocage;
  if (suivi?.etat === "en-cours" || suivi?.etat === "chargement") return "Ce plan est en cours de génération.";
  if (estUnExemple("decor", scene.decor)) return "Décris d'abord le décor de la scène.";
  if (estUnExemple("consigne", plan.consigne)) return "Écris d'abord ce qui se passe dans ce plan.";
  for (const id of plan.personnages) {
    const personnage = cinema.personnages.find((p) => p.id === id);
    if (!personnage) continue;
    if (estUnExemple("description", personnage.description)) return `Décris d'abord ${personnage.nom} dans le casting.`;
    if (!personnage.portrait) return `${personnage.nom} n'a pas encore de portrait : génère-le dans le casting.`;
  }
  return null;
}
