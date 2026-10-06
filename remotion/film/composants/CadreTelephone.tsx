import type { CSSProperties, ReactNode } from "react";

import { useMarque } from "../marque/MarqueDuFilm";

// Proportions d'un iPhone 16 : écran de 1179 × 2556 px, coins de l'écran à
// environ 13 % de sa largeur. Les captures Flutter du film ont le même
// rapport (780 × 1688 sur Kotizo, à 0,4 % près).
const RAPPORT_HAUTEUR = 2556 / 1179;
const RAYON_ECRAN = 0.13;
const CADRE = 0.035;

function dimensionsDuCadre(largeur: number) {
  const epaisseurDuCadre = Math.round(largeur * CADRE);
  const largeurEcran = largeur - epaisseurDuCadre * 2;
  const hauteurEcran = Math.round(largeurEcran * RAPPORT_HAUTEUR);
  const rayonEcran = Math.round(largeurEcran * RAYON_ECRAN);
  return { epaisseurDuCadre, largeurEcran, hauteurEcran, rayonEcran };
}

/** Hauteur totale d'un téléphone d'une largeur donnée, cadre compris. */
export function hauteurDuTelephone(largeur: number): number {
  const { epaisseurDuCadre, largeurEcran } = dimensionsDuCadre(largeur);
  return Math.round(largeurEcran * RAPPORT_HAUTEUR) + epaisseurDuCadre * 2;
}

type Props = {
  largeur: number;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * Le cadre d'encre commun à tous les téléphones du film : qu'il montre une
 * vraie capture de l'app (`Telephone`) ou un contenu fabriqué pour le plan
 * (`ConversationSMS`), mêmes proportions, même ombre. Un seul style de
 * téléphone dans tout le film, pas deux. Pas d'encoche ni de boutons : ce
 * qu'on montre, c'est l'application.
 */
export function CadreTelephone({ largeur, children, style }: Props) {
  const { couleurs, ombreTelephone } = useMarque();
  const { epaisseurDuCadre, largeurEcran, hauteurEcran, rayonEcran } = dimensionsDuCadre(largeur);
  return (
    <div
      style={{
        width: largeur,
        padding: epaisseurDuCadre,
        borderRadius: rayonEcran + epaisseurDuCadre,
        background: couleurs.encre,
        boxShadow: ombreTelephone,
        ...style,
      }}
    >
      <div
        style={{
          width: largeurEcran,
          height: hauteurEcran,
          borderRadius: rayonEcran,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}
