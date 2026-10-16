import { useCouleurs } from "../../marque/MarqueDuFilm";
import { imageDuTemps } from "../../lib/tempo";
import { Apparition } from "../composants/Apparition";
import type { MiseEnPage } from "../miseEnPage";
import { LISTE, SCENE } from "../rythme";

type Props = { elements: string[]; tempo: number; miseEnPage: MiseEnPage };

/** Les lignes numérotées, une tous les deux temps : on lit chacune avant la suivante. */
export function Liste({ elements, tempo, miseEnPage }: Props) {
  const couleurs = useCouleurs();
  const temps = (n: number) => imageDuTemps(SCENE.visuel + n, tempo);
  const largeur = Math.min(1100, miseEnPage.encadreLargeur);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, width: largeur }}>
      {elements.map((element, index) => (
        <Apparition key={element} debut={temps(LISTE.premier + index * LISTE.ecart)} depuis={0.85} style={{ transformOrigin: "left center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px 28px", borderRadius: 16, background: couleurs.clair }}>
            <span
              style={{
                flex: "none",
                width: 54,
                height: 54,
                borderRadius: 27,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: couleurs.accent,
                color: couleurs.clair,
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {index + 1}
            </span>
            <span style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.2, color: couleurs.encre }}>{element}</span>
          </div>
        </Apparition>
      ))}
    </div>
  );
}
