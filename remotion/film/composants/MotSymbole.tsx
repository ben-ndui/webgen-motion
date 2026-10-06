import { useCurrentFrame } from "remotion";

import { useCouleurs } from "../marque/MarqueDuFilm";
import { progression } from "../lib/mouvement";
import { Revele } from "./Revele";

type Props = {
  texte: string;
  graisse: number;
  // Approche en fraction de la taille (négative = serrée).
  approche: number;
  taille: number;
  couleur: string;
  debutMot: number;
  debutFilet: number;
  dureeDuFilet?: number;
};

// Épaisseur du filet, proportionnelle à la taille du mot. Un ratio unique,
// fin : aux tailles d'un film (90 à 200 px), le ratio plus fort d'un en-tête
// d'app ferait un trait disproportionné.
const RATIO_DU_FILET = 0.045;

/**
 * Le mot-symbole (bas de casse, approche serrée) puis son filet d'accent qui
 * se trace dessous, de gauche à droite. Repris de Kotizo, où il anime le
 * `KotizoWordmark` de l'app. Le filet porte la couleur de DÉCOR, jamais une
 * couleur de texte.
 */
export function MotSymbole({
  texte,
  graisse,
  approche,
  taille,
  couleur,
  debutMot,
  debutFilet,
  dureeDuFilet = 14,
}: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const trace = progression(image, debutFilet, dureeDuFilet);
  const epaisseur = Math.max(2, Math.round(taille * RATIO_DU_FILET));

  return (
    <div style={{ display: "inline-block" }}>
      <Revele taille={taille} debut={debutMot} duree={16}>
        <span
          style={{
            fontWeight: graisse,
            fontSize: taille,
            letterSpacing: `${approche * taille}px`,
            color: couleur,
          }}
        >
          {texte}
        </span>
      </Revele>
      <div
        style={{
          marginTop: Math.round(taille * 0.1),
          height: epaisseur,
          borderRadius: epaisseur / 2,
          background: couleurs.accent,
          transform: `scaleX(${trace})`,
          transformOrigin: "left",
        }}
      />
    </div>
  );
}
