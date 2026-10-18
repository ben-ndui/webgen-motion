import { Revele } from "../../composants/Revele";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { imageDuTemps } from "../../lib/tempo";
import { Apparition } from "../composants/Apparition";
import { Flottement } from "../composants/Flottement";
import { Picto } from "../../composants/Picto";
import type { MiseEnPage } from "../miseEnPage";
import { CHIFFRE, SCENE } from "../rythme";
import type { Picto as NomDePicto } from "../spec";

type Props = { picto: NomDePicto; valeur: string; tempo: number; miseEnPage: MiseEnPage };

/** Un pictogramme qui flotte, et sous lui le chiffre qui frappe. */
export function Chiffre({ picto, valeur, tempo, miseEnPage }: Props) {
  const couleurs = useCouleurs();
  const temps = (n: number) => imageDuTemps(SCENE.visuel + n, tempo);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Flottement>
        <Apparition debut={temps(0)}>
          <Picto nom={picto} taille={miseEnPage.picto} corps={couleurs.clair} trait={couleurs.encre} accent={couleurs.accent} />
        </Apparition>
      </Flottement>
      <Revele taille={miseEnPage.chiffre} debut={temps(CHIFFRE.valeur)}>
        <span style={{ fontSize: miseEnPage.chiffre, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", color: couleurs.accentSurSombre }}>
          {valeur}
        </span>
      </Revele>
    </div>
  );
}
