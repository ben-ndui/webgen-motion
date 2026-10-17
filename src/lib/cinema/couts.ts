import type { QualiteDeCinema } from "../../../remotion/film/cinema/types";

/**
 * Ce que coûte chaque génération chez Google, affiché AVANT le clic. Barème
 * relevé sur ai.google.dev/gemini-api/docs/pricing (09/2026) : un plan = 8 s
 * en 1080p, audio compris. Google ne facture pas ce qui n'aboutit pas.
 * Sans accès disque : l'écran l'importe.
 */
export const COUT_D_UN_PLAN_USD: Record<QualiteDeCinema, number> = { fast: 0.96, lite: 0.64 };
// Une image de la bible (personnage, créature, objet ou décor) : même modèle Gemini image.
export const COUT_D_UNE_IMAGE_DE_BIBLE_USD = 0.05;

/** « 0,96 $ » : le format qu'on lit à l'écran. */
export function enDollars(montant: number): string {
  return `${montant.toFixed(2).replace(".", ",")} $`;
}
