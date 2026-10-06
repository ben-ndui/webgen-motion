import { AbsoluteFill } from "remotion";

import { Logo } from "../composants/Logo";
import { useCouleurs } from "../marque/MarqueDuFilm";

type Props = { tempo: number };

/** Plan 1, l'ouverture : le logo se pose sur l'encre, sur la première mesure. */
export function P1Ouverture({ tempo }: Props) {
  const couleurs = useCouleurs();
  return (
    <AbsoluteFill style={{ background: couleurs.encre, alignItems: "center", justifyContent: "center" }}>
      <Logo taille={180} couleur={couleurs.clair} tempo={tempo} cadence="ouverture" />
    </AbsoluteFill>
  );
}
