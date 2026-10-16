import type { CSSProperties, ReactNode } from "react";

import { useMarque } from "../marque/MarqueDuFilm";

// La barre de titre d'une fenêtre macOS, en part de la largeur de la fenêtre.
const BARRE = 0.045;
const RAYON = 0.025;

/** Hauteur totale d'une fenêtre d'une largeur donnée, barre de titre comprise. */
export function hauteurDeLOrdinateur(largeur: number, rapport: number): number {
  return Math.round(largeur * rapport) + Math.round(largeur * BARRE);
}

type Props = {
  largeur: number;
  // Hauteur / largeur de la zone d'écran (celle des captures).
  rapport: number;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * Le pendant de `CadreTelephone` pour un produit qui tourne sur ordinateur :
 * une fenêtre macOS sobre (barre de titre, trois pastilles, coins arrondis),
 * même ombre que les téléphones. Pas de bureau ni de Dock autour : ce qu'on
 * montre, c'est l'application.
 */
export function CadreOrdinateur({ largeur, rapport, children, style }: Props) {
  const { couleurs, ombreTelephone } = useMarque();
  const barre = Math.round(largeur * BARRE);
  const rayon = Math.round(largeur * RAYON);
  const pastille = Math.round(barre * 0.28);
  return (
    <div
      style={{
        width: largeur,
        borderRadius: rayon,
        overflow: "hidden",
        background: couleurs.clair,
        boxShadow: ombreTelephone,
        border: `1px solid ${couleurs.encre}22`,
        ...style,
      }}
    >
      <div style={{ height: barre, display: "flex", alignItems: "center", gap: pastille * 0.7, paddingLeft: pastille * 1.6 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((teinte) => (
          <div key={teinte} style={{ width: pastille, height: pastille, borderRadius: pastille, background: teinte }} />
        ))}
      </div>
      <div style={{ width: largeur, height: Math.round(largeur * rapport), position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
