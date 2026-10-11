import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Logo } from "../composants/Logo";
import { Revele } from "../composants/Revele";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useCouleurs, useSurface } from "../marque/MarqueDuFilm";
import { useFormat } from "../lib/format";
import { GLISSE, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import { PHRASE } from "../lib/typo";

type Props = { tempo: number; signature: string };

const MISE_EN_PAGE = {
  paysage: { taille: 130, corps: 50, largeurDuTrait: 1500 },
  portrait: { taille: 110, corps: 44, largeurDuTrait: 900 },
} as const;
// Épaisseur du trait qui construit le logo.
const EPAISSEUR = 6;

/**
 * Le logo qui se construit : un trait d'accent traverse le cadre à la
 * hauteur du logo ; le logo se découvre derrière lui, exactement là où il
 * est passé (le masque suit le trait), puis la signature arrive dessous.
 * Le logo garde sa propre animation (filet, tracés, rideau) par-dessous.
 */
export function PLogoConstruit({ tempo, signature }: Props) {
  const couleurs = useCouleurs();
  const surface = useSurface("sombre");
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const { taille, corps, largeurDuTrait } = MISE_EN_PAGE[useFormat()];

  // Le bord avant du trait traverse en deux temps ; son bord arrière le suit
  // avec un temps de retard : un trait qui file, pas une barre qui grandit.
  const avant = progression(image, 0, temps(2), GLISSE);
  const arriere = progression(image, temps(1), temps(2), GLISSE);

  return (
    <AbsoluteFill style={{ background: surface.fond, alignItems: "center", justifyContent: "center" }}>
      <DecorDeDirection surface={surface} />
      <div style={{ position: "relative", width: largeurDuTrait }}>
        {/* Le masque a la largeur du TRAIT : son bord coïncide avec celui du
            trait, quelle que soit la largeur du logo. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            clipPath: `inset(-20% ${(1 - avant) * 100}% -20% 0)`,
          }}
        >
          <Logo taille={taille} couleur={surface.texte} surSombre={surface.tonalite === "sombre"} tempo={tempo} cadence="fin" />
        </div>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: largeurDuTrait,
            height: EPAISSEUR,
            marginTop: -EPAISSEUR / 2,
            borderRadius: EPAISSEUR,
            background: couleurs.accent,
            // Le trait n'existe qu'entre son bord arrière et son bord avant.
            clipPath: `inset(0 ${(1 - avant) * 100}% 0 ${arriere * 100}%)`,
          }}
        />
      </div>
      <div style={{ marginTop: Math.round(taille * 0.7) }}>
        <Revele taille={corps} debut={temps(3)}>
          <span style={{ ...PHRASE, fontSize: corps, color: surface.texteSecondaire }}>{signature}</span>
        </Revele>
      </div>
    </AbsoluteFill>
  );
}
