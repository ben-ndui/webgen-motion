import { AbsoluteFill } from "remotion";

import type { SurfaceDuPlan } from "../marque/direction";

// Pas de la grille de points, en px : assez serré pour faire une texture,
// assez large pour ne jamais se lire comme un motif.
const PAS_DES_POINTS = 34;

/**
 * Le fond propre à la direction artistique, posé sous le contenu d'un plan.
 * IMMOBILE, et sans opacité d'élément : un dégradé dont les couleurs portent
 * leur propre transparence ne crée pas la mosaïque de Remotion.
 */
export function DecorDeDirection({ surface }: { surface: SurfaceDuPlan }) {
  const { decor, couleurDuDecor } = surface;
  if (decor === "aucun") return null;
  if (decor === "points") {
    return (
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${couleurDuDecor} 1.6px, transparent 2.2px)`,
          backgroundSize: `${PAS_DES_POINTS}px ${PAS_DES_POINTS}px`,
          backgroundPosition: "center",
        }}
      />
    );
  }
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 45% at 50% 50%, ${couleurDuDecor}, transparent 75%)` }} />;
}
