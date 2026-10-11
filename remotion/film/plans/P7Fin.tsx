import { AbsoluteFill } from "remotion";

import { Logo } from "../composants/Logo";
import { Revele } from "../composants/Revele";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useMarque, useSurface } from "../marque/MarqueDuFilm";
import { imageDuTemps } from "../lib/tempo";
import { PHRASE } from "../lib/typo";
import { FIN } from "../reperes";
import type { TextesDuFilm } from "../textes/types";

type Props = { tempo: number; textes: TextesDuFilm["fin"]; avecContact: boolean };

/**
 * Plan 7, la fin : le logo se redessine, la disponibilité, puis le contact
 * dans les déclinaisons qui circulent seules. Sans contact là où la
 * plateforme l'interdit (Fiverr) ou l'affiche déjà (fiche de store).
 */
export function P7Fin({ tempo, textes, avecContact }: Props) {
  const { contact } = useMarque();
  const surface = useSurface("sombre");
  const temps = (n: number) => imageDuTemps(n, tempo);

  return (
    <AbsoluteFill style={{ background: surface.fond, alignItems: "center", justifyContent: "center" }}>
      <DecorDeDirection surface={surface} />
      <Logo taille={120} couleur={surface.texte} surSombre={surface.tonalite === "sombre"} tempo={tempo} cadence="fin" />

      <div style={{ marginTop: 64, textAlign: "center" }}>
        <Revele taille={44} debut={temps(FIN.disponible)}>
          <span style={{ ...PHRASE, fontSize: 44, color: surface.texteSecondaire }}>{textes.disponible}</span>
        </Revele>
      </div>

      {avecContact ? (
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Revele taille={32} debut={temps(FIN.contact)}>
            <span style={{ ...PHRASE, fontSize: 32, color: surface.texteLibelle }}>{contact}</span>
          </Revele>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
