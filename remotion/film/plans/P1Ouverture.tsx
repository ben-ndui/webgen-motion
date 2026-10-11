import { AbsoluteFill } from "remotion";

import { Logo } from "../composants/Logo";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useSurface } from "../marque/MarqueDuFilm";

type Props = { tempo: number };

/** Plan 1, l'ouverture : le logo se pose sur l'encre, sur la première mesure. */
export function P1Ouverture({ tempo }: Props) {
  const surface = useSurface("sombre");
  return (
    <AbsoluteFill style={{ background: surface.fond, alignItems: "center", justifyContent: "center" }}>
      <DecorDeDirection surface={surface} />
      <Logo taille={180} couleur={surface.texte} surSombre={surface.tonalite === "sombre"} tempo={tempo} cadence="ouverture" />
    </AbsoluteFill>
  );
}
