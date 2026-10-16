import { useCouleurs } from "../../marque/MarqueDuFilm";
import { imageDuTemps } from "../../lib/tempo";
import { Apparition } from "../composants/Apparition";
import { Picto } from "../../composants/Picto";
import type { MiseEnPage } from "../miseEnPage";
import { SCENE, TAMPON } from "../rythme";
import type { Picto as NomDePicto } from "../spec";

type Props = { picto: NomDePicto; tampon: string; tempo: number; miseEnPage: MiseEnPage };

/** Un objet sur sa fiche, puis le tampon qui s'écrase dessus (il tombe de plus grand). */
export function Tampon({ picto, tampon, tempo, miseEnPage }: Props) {
  const couleurs = useCouleurs();
  const temps = (n: number) => imageDuTemps(SCENE.visuel + n, tempo);
  return (
    <Apparition debut={temps(0)} style={{ position: "relative" }}>
      <div
        style={{
          width: 360,
          height: 440,
          borderRadius: 24,
          background: couleurs.clair,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Picto nom={picto} taille={miseEnPage.picto} corps={couleurs.encre} trait={couleurs.clair} accent={couleurs.accent} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Apparition debut={temps(TAMPON.tampon)} depuis={2.4} duree={8}>
          <div
            style={{
              transform: "rotate(-14deg)",
              padding: "10px 30px",
              border: `8px solid ${couleurs.accentSurClair}`,
              borderRadius: 14,
              background: couleurs.clair,
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: couleurs.accentSurClair,
              whiteSpace: "nowrap",
            }}
          >
            {tampon}
          </div>
        </Apparition>
      </div>
    </Apparition>
  );
}
