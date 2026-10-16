import type { CSSProperties } from "react";

import { useMarque } from "../marque/MarqueDuFilm";
import { CadreOrdinateur, hauteurDeLOrdinateur } from "./CadreOrdinateur";
import { EcranReel } from "./EcranReel";
import { Telephone, hauteurDuTelephone } from "./Telephone";

// Une fenêtre d'ordinateur est plus large qu'un téléphone pour la même place
// à l'écran : les plans donnent une largeur de téléphone, on l'agrandit d'autant.
export const AGRANDISSEMENT_ORDINATEUR = 1.9;

/** Les dimensions de l'appareil du film pour une largeur « téléphone » donnée. */
export function useDimensionsDeLAppareil(largeurTelephone: number): { largeur: number; hauteur: number } {
  const { appareil } = useMarque();
  if (appareil?.type === "ordinateur") {
    const largeur = Math.round(largeurTelephone * AGRANDISSEMENT_ORDINATEUR);
    return { largeur, hauteur: hauteurDeLOrdinateur(largeur, appareil.rapport) };
  }
  return { largeur: largeurTelephone, hauteur: hauteurDuTelephone(largeurTelephone) };
}

type Props = {
  ecran: string;
  // Largeur qu'aurait un téléphone à cet endroit (voir AGRANDISSEMENT_ORDINATEUR).
  largeur: number;
  style?: CSSProperties;
  debut?: number;
};

/** Une VRAIE capture de l'application, dans le cadre de l'appareil du produit. */
export function Appareil({ ecran, largeur, style, debut }: Props) {
  const { appareil } = useMarque();
  if (appareil?.type !== "ordinateur") return <Telephone ecran={ecran} largeur={largeur} style={style} debut={debut} />;
  const largeurFenetre = Math.round(largeur * AGRANDISSEMENT_ORDINATEUR);
  return (
    <CadreOrdinateur largeur={largeurFenetre} rapport={appareil.rapport} style={style}>
      <EcranReel
        fichier={ecran}
        debut={debut}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      />
    </CadreOrdinateur>
  );
}
