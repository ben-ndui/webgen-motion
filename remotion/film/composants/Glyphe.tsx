import { useCurrentFrame } from "remotion";

import { progression } from "../lib/mouvement";

type Props = {
  // Tracés SVG officiels de l'identité, dans une boîte de 100 × 100.
  traces: readonly string[];
  taille: number;
  couleur: string;
  // Image où chaque trait commence à se dessiner, un par tracé. Absent : le
  // glyphe est déjà entier.
  departs?: readonly number[];
  dureeDuTrait?: number;
};

// Épaisseur selon la taille de rendu : la correction optique de VAGUA (un
// trait plus épais en petit, pour qu'il ne disparaisse pas).
function epaisseur(taille: number): number {
  if (taille >= 200) return 3;
  if (taille >= 100) return 3.2;
  if (taille >= 56) return 3.6;
  return 4.4;
}

/** Un glyphe qui se dessine trait par trait. Repris de VAGUA. */
export function Glyphe({ traces, taille, couleur, departs, dureeDuTrait = 12 }: Props) {
  const image = useCurrentFrame();

  return (
    <svg width={taille} height={taille} viewBox="0 0 100 100" fill="none">
      {traces.map((trace, index) => {
        const depart = departs?.[index];
        const dessine = depart === undefined ? 1 : progression(image, depart, dureeDuTrait);
        return (
          <path
            key={trace}
            d={trace}
            stroke={couleur}
            strokeWidth={epaisseur(taille)}
            strokeLinecap="round"
            // `pathLength` ramène chaque trait à une longueur de 1 : le
            // pointillé le cache puis le découvre, quel que soit son tracé.
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - dessine}
            // Un trait de longueur nulle garde son bout arrondi : un point
            // apparaîtrait avant le dessin.
            visibility={dessine === 0 ? "hidden" : "visible"}
          />
        );
      })}
    </svg>
  );
}
