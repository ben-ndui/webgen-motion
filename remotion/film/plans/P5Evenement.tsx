import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Revele } from "../composants/Revele";
import { Appareil } from "../composants/Appareil";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useMarque, useSurface } from "../marque/MarqueDuFilm";
import { MARGE_PORTRAIT, RESERVE_HAUT, useFormat } from "../lib/format";
import { imageDuTemps } from "../lib/tempo";
import { TITRE } from "../lib/typo";
import { TEMPS_PAR_ETAT, tempsDeLaChute } from "../reperes";
import type { EcransDuFilm, TextesDuFilm } from "../spec";

type Props = {
  tempo: number;
  textes: TextesDuFilm["evenement"];
  etats: EcransDuFilm["evenement"];
  dossierDesEcrans: string;
};


// En 9:16, le téléphone sous la réserve du haut, la chute dessous et
// au-dessus de la réserve du bas (1920 - 400).
const MISE_EN_PAGE = {
  paysage: { telephone: { left: 160, top: 40, largeur: 480 }, texte: { left: 760, top: 460, width: 1000 } },
  portrait: {
    telephone: { left: (1080 - 460) / 2, top: RESERVE_HAUT + 10, largeur: 460 },
    texte: { left: MARGE_PORTRAIT, top: 1250, width: 1080 - 2 * MARGE_PORTRAIT },
  },
} as const;

// Une fenêtre d'ordinateur (largeur × AGRANDISSEMENT_ORDINATEUR) prend la
// moitié gauche du cadre ; la chute passe à droite, ou dessous en 9:16.
const MISE_EN_PAGE_ORDINATEUR = {
  paysage: { telephone: { left: 90, top: 120, largeur: 450 }, texte: { left: 1010, top: 430, width: 820 } },
  portrait: {
    telephone: { left: (1080 - 874) / 2, top: RESERVE_HAUT + 10, largeur: 460 },
    texte: { left: MARGE_PORTRAIT, top: 1150, width: 1080 - 2 * MARGE_PORTRAIT },
  },
} as const;

/**
 * Plan 5, l'événement qui PAIE le problème : le même écran réel bascule d'un
 * état au suivant, un par mesure, jusqu'à celui où il n'y a plus rien à
 * régler. Bascules franches, sur le temps : pas de fondu entre deux captures.
 */
export function P5Evenement({ tempo, textes, etats, dossierDesEcrans }: Props) {
  const surface = useSurface("clair");
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const { appareil } = useMarque();
  const page = (appareil?.type === "ordinateur" ? MISE_EN_PAGE_ORDINATEUR : MISE_EN_PAGE)[useFormat()];
  const indexCourant = Math.min(etats.length - 1, Math.floor(image / temps(TEMPS_PAR_ETAT)));
  const ecran = etats[indexCourant] ?? etats[0];
  const debutChute = temps(tempsDeLaChute(etats.length));

  return (
    <AbsoluteFill style={{ background: surface.fond }}>
      <DecorDeDirection surface={surface} />
      <div style={{ position: "absolute", left: page.telephone.left, top: page.telephone.top }}>
        <Appareil ecran={`${dossierDesEcrans}/${ecran}`} largeur={page.telephone.largeur} />
      </div>
      <div style={{ position: "absolute", ...page.texte, textWrap: "balance" }}>
        <Revele taille={TITRE.fontSize as number} debut={debutChute}>
          <span style={{ ...TITRE, ...surface.titre, color: surface.accentTexte }}>{textes.chute}</span>
        </Revele>
      </div>
    </AbsoluteFill>
  );
}
