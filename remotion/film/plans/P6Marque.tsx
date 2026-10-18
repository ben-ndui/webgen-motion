import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Revele } from "../composants/Revele";
import { Appareil } from "../composants/Appareil";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useMarque, useSurface } from "../marque/MarqueDuFilm";
import { MARGE_PORTRAIT, RESERVE_HAUT, useFormat } from "../lib/format";
import { entre, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import { MARGE, TAILLES, TITRE } from "../lib/typo";
import type { TextesDuFilm } from "../spec";

type Props = { tempo: number; textes: TextesDuFilm["marque"]; ecran: string; dossierDesEcrans: string };

const MISE_EN_PAGE = {
  paysage: { texte: { left: MARGE, top: 330 }, telephone: { left: 1180, top: 60, largeur: 460 }, course: 760 },
  portrait: {
    texte: { left: MARGE_PORTRAIT, top: RESERVE_HAUT },
    telephone: { left: (1080 - 480) / 2, top: 700, largeur: 480 },
    course: 900,
  },
} as const;

// Avec une fenêtre d'ordinateur (largeur × AGRANDISSEMENT_ORDINATEUR) : à
// droite en 16:9 sans sortir du cadre, centrée et au-dessus de la réserve basse en 9:16.
const MISE_EN_PAGE_ORDINATEUR = {
  paysage: { texte: { left: MARGE, top: 330 }, telephone: { left: 980, top: 140, largeur: 470 }, course: 760 },
  portrait: {
    texte: { left: MARGE_PORTRAIT, top: RESERVE_HAUT },
    telephone: { left: (1080 - 836) / 2, top: 700, largeur: 440 },
    course: 900,
  },
} as const;

/**
 * Plan 6, la marque : une coda HONNÊTE, pas le climax. Trois mots, un par
 * temps, puis l'écran réel qui prouve la promesse monte du bas (chez Kotizo :
 * le virement où l'organisateur est bénéficiaire, jamais Kotizo).
 */
export function P6Marque({ tempo, textes, ecran, dossierDesEcrans }: Props) {
  const surface = useSurface("sombre");
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const { appareil } = useMarque();
  const page = (appareil?.type === "ordinateur" ? MISE_EN_PAGE_ORDINATEUR : MISE_EN_PAGE)[useFormat()];
  const montee = progression(image, temps(3), temps(3));
  const dernier = textes.mots.length - 1;

  return (
    <AbsoluteFill style={{ background: surface.fond }}>
      <DecorDeDirection surface={surface} />
      <div style={{ position: "absolute", ...page.texte }}>
        {textes.mots.map((mot, index) => (
          <div key={mot}>
            <Revele taille={TAILLES.titre} debut={temps(index)}>
              <span style={{ ...TITRE, ...surface.titre, color: index === dernier ? surface.accentTexte : surface.texte }}>
                {mot}
              </span>
            </Revele>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: page.telephone.left,
          top: page.telephone.top,
          // Monte depuis le bas du cadre ; pas d'opacité (voir Revele).
          transform: `translateY(${entre(page.course, 0, montee)}px)`,
        }}
      >
        <Appareil ecran={`${dossierDesEcrans}/${ecran}`} largeur={page.telephone.largeur} debut={temps(3)} />
      </div>
    </AbsoluteFill>
  );
}
