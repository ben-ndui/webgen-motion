import { Img, staticFile, useCurrentFrame } from "remotion";

import { progression } from "../lib/mouvement";

type Props = {
  // Fichier officiel, dans public/.
  fichier: string;
  // Largeur / hauteur du fichier.
  rapport: number;
  // Hauteur du logo, en px.
  hauteur: number;
  inverser: boolean;
  // Image où le rideau commence à s'ouvrir.
  debut: number;
  duree: number;
};

/**
 * Un logo fourni en fichier, découvert de gauche à droite par un rideau
 * (`clip-path`). Repris du film Smooth & Design : un logo qui n'est ni un mot
 * ni un tracé simple ne se redessine pas, il se dévoile. Aucune opacité.
 */
export function LogoImage({ fichier, rapport, hauteur, inverser, debut, duree }: Props) {
  const image = useCurrentFrame();
  const decouvert = progression(image, debut, duree);

  return (
    <Img
      src={staticFile(fichier)}
      style={{
        display: "block",
        height: hauteur,
        width: Math.round(hauteur * rapport),
        // Un logo noir posé sur l'encre : on l'inverse en clair.
        filter: inverser ? "invert(1)" : undefined,
        clipPath: `inset(0 ${(1 - decouvert) * 100}% 0 0)`,
      }}
    />
  );
}
