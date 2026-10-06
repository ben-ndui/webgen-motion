import { AbsoluteFill } from "remotion";

import { Logo } from "../composants/Logo";
import { Revele } from "../composants/Revele";
import { useMarque } from "../marque/MarqueDuFilm";
import { imageDuTemps } from "../lib/tempo";
import { PHRASE } from "../lib/typo";
import type { TextesDuFilm } from "../textes/types";

type Props = { tempo: number; textes: TextesDuFilm["fin"]; avecContact: boolean };

/**
 * Plan 7, la fin : le logo se redessine, la disponibilité, puis le contact
 * dans les déclinaisons qui circulent seules. Sans contact là où la
 * plateforme l'interdit (Fiverr) ou l'affiche déjà (fiche de store).
 */
export function P7Fin({ tempo, textes, avecContact }: Props) {
  const { couleurs, contact } = useMarque();
  const temps = (n: number) => imageDuTemps(n, tempo);

  return (
    <AbsoluteFill style={{ background: couleurs.encre, alignItems: "center", justifyContent: "center" }}>
      <Logo taille={120} couleur={couleurs.clair} tempo={tempo} cadence="fin" />

      <div style={{ marginTop: 64, textAlign: "center" }}>
        <Revele taille={44} debut={temps(2.5)}>
          <span style={{ ...PHRASE, fontSize: 44, color: couleurs.clairSecondaire }}>{textes.disponible}</span>
        </Revele>
      </div>

      {avecContact ? (
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Revele taille={32} debut={temps(3.5)}>
            <span style={{ ...PHRASE, fontSize: 32, color: couleurs.clairLibelle }}>{contact}</span>
          </Revele>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
