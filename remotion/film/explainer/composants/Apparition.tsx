import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { entre, progression } from "../../lib/mouvement";

type Props = {
  children: ReactNode;
  // Image (locale à la scène) où l'élément commence à grandir.
  debut: number;
  duree?: number;
  // Taille de départ : 0 = surgit d'un point, 0.8 = se pose.
  depuis?: number;
  style?: CSSProperties;
};

/**
 * Un élément qui grandit jusqu'à sa taille : la seule entrée des objets d'un
 * explainer. SANS opacité, délibérément : une opacité partielle cumulée à une
 * transformation fait répéter la couche en mosaïque par Remotion (voir Revele).
 * Avant son début, l'élément est à l'échelle 0 : invisible sans opacité.
 */
export function Apparition({ children, debut, duree = 12, depuis = 0, style }: Props) {
  const image = useCurrentFrame();
  const t = progression(image, debut, duree);
  const echelle = image < debut ? 0 : entre(depuis, 1, t);
  return <div style={{ transform: `scale(${echelle})`, ...style }}>{children}</div>;
}
