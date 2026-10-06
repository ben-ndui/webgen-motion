import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";

import { CadreTelephone, hauteurDuTelephone } from "./CadreTelephone";

export { hauteurDuTelephone };

type Props = {
  // Chemin dans public/, par ex. « ecrans-en/parcours-1.png ».
  ecran: string;
  largeur: number;
  style?: CSSProperties;
};

/** Une VRAIE capture de l'application, dans le cadre commun. */
export function Telephone({ ecran, largeur, style }: Props) {
  return (
    <CadreTelephone largeur={largeur} style={style}>
      <Img
        src={staticFile(ecran)}
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
