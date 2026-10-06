import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { GLISSE, entre, progression } from "../lib/mouvement";

type Props = {
  children: ReactNode;
  // Durée du plan lui-même, en images (sans le chevauchement de sortie).
  duree: number;
  // Durée d'une transition, en images. 0 : pas de transition de ce côté.
  entree: number;
  sortie: number;
};

// Largeur du bord adouci, en pourcentage de la diagonale : c'est lui qui rend
// la transition douce au lieu d'un coup de volet.
// Attention : étroit, et c'est voulu : à 22 %, la zone où les deux plans se mêlent
// était si large qu'on lisait deux textes superposés à moitié transparents
// (« Ticket in hand. » sous « 11 »), une double exposition, pas une transition.
const BORD_ADOUCI = 9;
// Le plan qui part avance un peu vers nous, celui qui arrive se pose.
// Attention : un ZOOM, pas un glissement latéral : décalé de côté, le plan sortant
// découvrait un liseré de fond sur son bord pendant la transition.
const ZOOM = 0.035;

/**
 * La transition du film (choisie sur VAGUA le 30/09 : « plus smooth, moins
 * radicale ») : le plan suivant se DÉCOUVRE derrière un bord en dégradé
 * incliné à 60° (l’angle de la route du parcours), pendant que le plan qui
 * part avance légèrement. Aucun aplat de couleur, aucune coupure.
 *
 * Le plan qui arrive est rendu PAR-DESSUS celui qui part (ordre des
 * séquences) ; celui qui part reste affiché `sortie` images de plus.
 */
export function Glissement({ children, duree, entree, sortie }: Props) {
  const image = useCurrentFrame();
  const arrivee = entree > 0 ? progression(image, 0, entree, GLISSE) : 1;
  const depart = sortie > 0 ? progression(image, duree, sortie, GLISSE) : 0;

  // Le masque va de « rien » à « tout » : le bord commence avant le coin
  // haut-gauche et finit après le coin bas-droit, sinon l'écran ne serait
  // jamais entièrement couvert ni entièrement découvert.
  const front = entre(-BORD_ADOUCI, 100, arrivee);
  // 120deg : le dégradé avance vers le bas-droite, sa frontière monte à 60°.
  const masque = `linear-gradient(120deg, #000 ${front}%, transparent ${front + BORD_ADOUCI}%)`;
  const enCours = arrivee < 1;

  const echelle = enCours ? entre(1 + ZOOM, 1, arrivee) : 1 + depart * ZOOM;

  return (
    <AbsoluteFill
      style={{
        transform: echelle === 1 ? undefined : `scale(${echelle})`,
        // Le masque est retiré dès la fin de l'arrivée : un masque « plein »
        // laissé en place coûte un calque de plus à chaque image.
        WebkitMaskImage: enCours ? masque : undefined,
        maskImage: enCours ? masque : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
