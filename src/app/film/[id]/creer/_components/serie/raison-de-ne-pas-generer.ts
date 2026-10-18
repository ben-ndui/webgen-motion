import { estUnExemple } from "../../../../../../../remotion/film/cinema/exemples";
import type { CinemaDuFilm, PlanDeCinema, SceneDeCinema } from "../../../../../../../remotion/film/cinema/types";
import type { ReferenceAffichee } from "./use-bible";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";

/**
 * Pourquoi le bouton « Générer ce plan » est grisé, en une phrase ; `null` si
 * on peut lancer. Les mêmes refus existent côté serveur : l'écran les dit
 * AVANT le clic, le serveur les garantit. `references` null (bible pas
 * encore chargée) : le contrôle de validation n'est pas fait, par défaut on
 * laisse cliquer plutôt que griser à tort.
 */
export function raisonDeNePasGenerer(
  cinema: CinemaDuFilm,
  scene: SceneDeCinema,
  plan: PlanDeCinema,
  suivi: SuiviDUnPlan | undefined,
  blocage: string | null,
  references: ReferenceAffichee[] | null,
): string | null {
  if (blocage) return blocage;
  if (suivi?.etat === "en-cours" || suivi?.etat === "chargement") return "Ce plan est en cours de génération.";
  if (estUnExemple("decor", scene.decor)) return "Décris d'abord le décor de la scène.";
  if (estUnExemple("consigne", plan.consigne)) return "Écris d'abord ce qui se passe dans ce plan.";
  for (const id of plan.personnages) {
    const personnage = cinema.personnages.find((p) => p.id === id);
    if (!personnage) continue;
    if (estUnExemple("description", personnage.description)) return `Décris d'abord ${personnage.nom} dans le casting.`;
    const reference = references?.find((r) => r.id === id);
    if (reference && reference.fiche.statut !== "valide") return `${personnage.nom} n'a pas encore d'image validée dans la bible.`;
  }
  return null;
}
