import { AbsoluteFill } from "remotion";

import { Revele } from "../composants/Revele";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useSurface } from "../marque/MarqueDuFilm";
import { MARGE_PORTRAIT, useFormat } from "../lib/format";
import { imageDuTemps } from "../lib/tempo";
import { MARGE, PHRASE, TAILLES, TITRE } from "../lib/typo";
import type { TextesDuFilm } from "../textes/types";

const MISE_EN_PAGE = {
  paysage: { left: MARGE, top: 390, width: 1920 - 2 * MARGE },
  portrait: { left: MARGE_PORTRAIT, top: 560, width: 1080 - 2 * MARGE_PORTRAIT },
} as const;

type Props = { tempo: number; textes: TextesDuFilm["bascule"] };

/**
 * Plan 3, la bascule : le fond passe au clair, et un CHIFFRE remplace la
 * plainte. Un constat, le chiffre en accent (il sort d'un vrai calcul de
 * l'app), puis la promesse en une phrase. Aucune marque tierce nommée.
 */
export function P3Bascule({ tempo, textes }: Props) {
  const surface = useSurface("clair");
  const temps = (n: number) => imageDuTemps(n, tempo);
  const page = MISE_EN_PAGE[useFormat()];
  const ligne = { ...TITRE, ...surface.titre, color: surface.texte, display: "block" } as const;

  return (
    <AbsoluteFill style={{ background: surface.fond }}>
      <DecorDeDirection surface={surface} />
      <div style={{ position: "absolute", ...page, textWrap: "balance" }}>
        <div>
          <Revele taille={TAILLES.titre} debut={temps(0)}>
            <span style={ligne}>{textes.constat}</span>
          </Revele>
        </div>
        <div>
          <Revele taille={TAILLES.titre} debut={temps(1.5)}>
            <span style={{ ...ligne, color: surface.accentTexte }}>{textes.chiffre}</span>
          </Revele>
        </div>
        <div style={{ marginTop: 28 }}>
          <Revele taille={TAILLES.phrase} debut={temps(5)}>
            <span style={{ ...PHRASE, fontWeight: 500, color: surface.texteSecondaire }}>{textes.signature}</span>
          </Revele>
        </div>
      </div>
    </AbsoluteFill>
  );
}
