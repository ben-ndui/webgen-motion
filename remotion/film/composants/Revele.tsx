import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { GLISSE, progression } from "../lib/mouvement";

type Props = {
  children: ReactNode;
  // Taille du texte révélé, en px. Obligatoire : c'est d'elle que dépend la
  // marge du masque (voir plus bas).
  taille: number;
  // Image (locale au plan) où le texte commence à monter.
  debut: number;
  // Image où il repart vers le haut. Absent : il reste.
  sortie?: number;
  duree?: number;
  style?: CSSProperties;
};

/**
 * Un texte qui monte depuis une fente, comme une ligne de générique.
 *
 * Attention : AUCUNE OPACITÉ, et c'est délibéré : le compositeur de Remotion répète une
 * couche en mosaïque quand elle cumule une opacité partielle et une
 * transformation (constaté dans GEN MOTION, 20/07/2026). Le masque
 * (`overflow: hidden`) fait apparaître le texte sans jamais le rendre
 * semi-transparent.
 */
export function Revele({ children, taille, debut, sortie, duree = 14, style }: Props) {
  const image = useCurrentFrame();
  const entree = progression(image, debut, duree);
  const depart = sortie === undefined ? 0 : progression(image, sortie, duree, GLISSE);
  const margeHaute = Math.round(taille * 0.2);
  const margeBasse = Math.round(taille * 0.14);
  // 0 = en place. Pour être hors du masque, le texte doit parcourir sa propre
  // hauteur PLUS la marge du masque : sans la marge, les jambages d'une ligne
  // sortie restaient visibles dans le haut du masque, comme des traces.
  const pourcent = (1 - entree) * 110 - depart * 110;
  const pixels = (1 - entree) * margeBasse - depart * margeHaute;

  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "top",
        // De la marge sous la ligne ET au-dessus : sans elle, le masque coupe
        // les jambages (g, p, y) et les accents des capitales (« À » perdait
        // son accent). Les marges négatives compensent : la ligne ne bouge pas.
        //
        // Attention : en PIXELS, calculés sur la taille du texte. En `em`, elles se
        // calculaient sur la police du masque (16 px hérités, pas les 118 du
        // titre qu’il contient) et ne valaient que 2 px.
        paddingTop: margeHaute,
        paddingBottom: margeBasse,
        marginTop: -margeHaute,
        marginBottom: -margeBasse,
        ...style,
      }}
    >
      <span style={{ display: "inline-block", transform: `translateY(calc(${pourcent}% + ${pixels}px))` }}>
        {children}
      </span>
    </span>
  );
}
