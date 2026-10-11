import type { CSSProperties } from "react";
import { EcranReel } from "./EcranReel";

import { CadreTelephone, hauteurDuTelephone } from "./CadreTelephone";

export { hauteurDuTelephone };

type Props = {
  // Chemin dans public/, par ex. « ecrans-en/parcours-1.png ».
  ecran: string;
  largeur: number;
  style?: CSSProperties;
  // Pour un écran filmé : l'image où il se met à défiler.
  debut?: number;
};

/** Un VRAI écran de l'application (capture ou vidéo), dans le cadre commun. */
export function Telephone({ ecran, largeur, style, debut }: Props) {
  return (
    <CadreTelephone largeur={largeur} style={style}>
      <EcranReel
        fichier={ecran}
        debut={debut}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top",
        }}
      />
    </CadreTelephone>
  );
}
