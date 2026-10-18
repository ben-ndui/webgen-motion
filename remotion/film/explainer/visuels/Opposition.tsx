import { useCurrentFrame } from "remotion";

import { useCouleurs } from "../../marque/MarqueDuFilm";
import { progression } from "../../lib/mouvement";
import { imageDuTemps } from "../../lib/tempo";
import { Apparition } from "../composants/Apparition";
import { Picto } from "../../composants/Picto";
import type { MiseEnPage } from "../miseEnPage";
import { OPPOSITION, SCENE } from "../rythme";
import type { CarteDOpposition, Picto as NomDePicto } from "../spec";

type Props = {
  pictos: { gauche: NomDePicto; droite: NomDePicto };
  gauche: CarteDOpposition;
  droite: CarteDOpposition;
  tempo: number;
  miseEnPage: MiseEnPage;
};

/** Ce qu'on croit, barré ; ce qui est, souligné. Le « ≠ » arrive avec la seconde carte. */
export function Opposition({ pictos, gauche, droite, tempo, miseEnPage }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(SCENE.visuel + n, tempo);
  const barre = progression(image, temps(OPPOSITION.barre), 10);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: miseEnPage.oppositionEnColonne ? "column" : "row",
        alignItems: "center",
        gap: miseEnPage.oppositionEnColonne ? 24 : 60,
      }}
    >
      <Apparition debut={temps(OPPOSITION.gauche)} style={{ position: "relative" }}>
        <Carte picto={pictos.gauche} carte={gauche} miseEnPage={miseEnPage} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <line x1={6} y1={92} x2={6 + 88 * barre} y2={92 - 84 * barre} stroke={couleurs.accentSurClair} strokeWidth={10} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </Apparition>
      <Apparition debut={temps(OPPOSITION.droite)}>
        <span style={{ fontSize: 110, fontWeight: 600, lineHeight: 1, color: couleurs.clair }}>≠</span>
      </Apparition>
      <Apparition debut={temps(OPPOSITION.droite)}>
        <Carte picto={pictos.droite} carte={droite} miseEnPage={miseEnPage} misEnAvant />
      </Apparition>
    </div>
  );
}

function Carte({ picto, carte, miseEnPage, misEnAvant = false }: {
  picto: NomDePicto; carte: CarteDOpposition; miseEnPage: MiseEnPage; misEnAvant?: boolean;
}) {
  const couleurs = useCouleurs();
  const largeur = miseEnPage.oppositionEnColonne ? 640 : 500;
  return (
    <div
      style={{
        width: largeur,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "34px 36px",
        borderRadius: 22,
        background: couleurs.clair,
        boxShadow: misEnAvant ? `0 0 0 8px ${couleurs.accent}` : "none",
      }}
    >
      <Picto nom={picto} taille={110} corps={couleurs.encre} trait={couleurs.clair} accent={couleurs.accent} />
      <div>
        <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.1, color: couleurs.encre }}>{carte.titre}</div>
        <div style={{ fontSize: 30, marginTop: 6, color: couleurs.encreSecondaire }}>{carte.detail}</div>
      </div>
    </div>
  );
}
