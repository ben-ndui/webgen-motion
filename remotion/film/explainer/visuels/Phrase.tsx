import { Revele } from "../../composants/Revele";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { imageDuTemps } from "../../lib/tempo";
import { Apparition } from "../composants/Apparition";
import { Flottement } from "../composants/Flottement";
import { Picto } from "../../composants/Picto";
import type { MiseEnPage } from "../miseEnPage";
import { PHRASE_FINALE, SCENE } from "../rythme";
import type { Picto as NomDePicto } from "../spec";

type Props = { picto: NomDePicto; phrase: string; motFort: string; tempo: number; miseEnPage: MiseEnPage };

/** La conclusion, seule à l'écran : pas d'encadré, le mot fort en accent. */
export function Phrase({ picto, phrase, motFort, tempo, miseEnPage }: Props) {
  const couleurs = useCouleurs();
  const temps = (n: number) => imageDuTemps(SCENE.visuel + n, tempo);
  const debutDuMot = phrase.indexOf(motFort);
  const avant = phrase.slice(0, debutDuMot);
  const apres = phrase.slice(debutDuMot + motFort.length);
  const taille = Math.round(miseEnPage.tailleSousTitre * 1.5);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 56, maxWidth: miseEnPage.encadreLargeur }}>
      <Flottement>
        <Apparition debut={temps(0)}>
          <Picto nom={picto} taille={Math.round(miseEnPage.picto * 0.8)} corps={couleurs.clair} trait={couleurs.encre} accent={couleurs.accent} />
        </Apparition>
      </Flottement>
      <div style={{ textAlign: "center" }}>
        <Revele taille={taille} debut={temps(PHRASE_FINALE.phrase)}>
          <span style={{ fontSize: taille, fontWeight: 500, lineHeight: 1.2, color: couleurs.clair }}>
            {avant}
            <strong style={{ fontWeight: 700, color: couleurs.accentSurSombre }}>{motFort}</strong>
            {apres}
          </span>
        </Revele>
      </div>
    </div>
  );
}
