import { useCurrentFrame } from "remotion";

import { Revele } from "../../composants/Revele";
import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { progression } from "../../lib/mouvement";
import type { MiseEnPage } from "../miseEnPage";

type Props = {
  sousTitre: string;
  precision?: string;
  // Images (locales à la scène) où chaque ligne arrive.
  debut: number;
  debutPrecision: number;
  miseEnPage: MiseEnPage;
};

/**
 * L'encadré du bas : la phrase qu'on lit sans le son, et sa précision en
 * accent. Le cadre se trace de gauche à droite, puis chaque ligne monte.
 */
export function Encadre({ sousTitre, precision, debut, debutPrecision, miseEnPage }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const trace = progression(image, debut - 6, 12);
  return (
    <div
      style={{
        position: "absolute",
        bottom: miseEnPage.encadreBas,
        left: "50%",
        width: miseEnPage.encadreLargeur,
        marginLeft: -miseEnPage.encadreLargeur / 2,
        padding: "26px 40px",
        boxSizing: "border-box",
        textAlign: "center",
        borderRadius: 16,
        border: `2px solid ${transparence(couleurs.accentSurSombre, 0.35)}`,
        borderLeft: `10px solid ${couleurs.accent}`,
        background: transparence(couleurs.clair, 0.05),
        clipPath: `inset(0 ${(1 - trace) * 100}% 0 0 round 16px)`,
      }}
    >
      <Revele taille={miseEnPage.tailleSousTitre} debut={debut}>
        <span style={{ fontSize: miseEnPage.tailleSousTitre, fontWeight: 600, lineHeight: 1.2, color: couleurs.clair }}>
          {sousTitre}
        </span>
      </Revele>
      {precision ? (
        <div style={{ marginTop: 10 }}>
          <Revele taille={miseEnPage.taillePrecision} debut={debutPrecision}>
            <span style={{ fontSize: miseEnPage.taillePrecision, fontWeight: 500, color: couleurs.accentSurSombre }}>
              {precision}
            </span>
          </Revele>
        </div>
      ) : null}
    </div>
  );
}
