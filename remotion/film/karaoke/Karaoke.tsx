import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { FournisseurDeMarque } from "../marque/MarqueDuFilm";
import { usePolice } from "../marque/police";
import type { DeclinaisonDuFilm } from "../spec";
import { CarteDeFin, CarteDeTitre, Signature } from "./composants/Cartouches";
import { Horizon } from "./composants/Horizon";
import { Paroles } from "./composants/Paroles";
import { FONDU_DES_PAROLES, dureeDuPassage, lignesDuPassage, premierChant } from "./lecture";
import type { KaraokeSpec, ParolesDuKaraoke } from "./spec";

// Les paroles arrivent par `calculateMetadata` (lues dans public/), pas par la fiche.
export type ProprietesDuKaraoke = { spec: KaraokeSpec; declinaison: DeclinaisonDuFilm; paroles?: ParolesDuKaraoke };

// La carte de fin, après le passage, et le fondu du morceau dessous.
export const SECONDES_DE_FIN = 4;
const FONDU = 1.5;

/** Le clip : le décor, la signature, les paroles du passage, puis la carte de fin. */
export function Karaoke({ spec, declinaison, paroles }: ProprietesDuKaraoke) {
  const police = usePolice(spec.marque.police);
  const { fps, durationInFrames } = useVideoConfig();
  const image = useCurrentFrame();
  const { morceau } = spec;
  const lignes = lignesDuPassage(paroles?.lignes ?? [], morceau.debut, morceau.fin);
  const imagesDuPassage = Math.round(dureeDuPassage(paroles?.lignes ?? [], morceau.debut, morceau.fin) * fps);
  // Un fondu SANS mouvement (pas de mosaïque Remotion) : les paroles s'effacent avant la carte de fin.
  const effacement = interpolate(image, [imagesDuPassage - FONDU_DES_PAROLES * fps, imagesDuPassage], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titreJusqua = premierChant(lignes) >= 2 ? premierChant(lignes) - 0.5 : 0;
  return (
    <FournisseurDeMarque marque={spec.marque}>
      <AbsoluteFill style={{ fontFamily: police }}>
        <Audio
          src={staticFile(morceau.fichier)}
          trimBefore={Math.round(morceau.debut * fps)}
          volume={(image) =>
            interpolate(image, [durationInFrames - FONDU * fps - 1, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
        <Horizon tempo={morceau.tempo} premierTemps={morceau.premierTemps} debutDuPassage={morceau.debut} />
        <Sequence durationInFrames={imagesDuPassage} name="passage">
          {/* La carte de titre ne s'affiche que si le passage s'ouvre sur une intro (au moins 2 s). */}
          <AbsoluteFill style={{ opacity: effacement }}>
            <Signature morceau={morceau} apres={titreJusqua} />
            {titreJusqua > 0 ? <CarteDeTitre morceau={morceau} jusqua={titreJusqua} /> : null}
            <Paroles lignes={lignes} />
          </AbsoluteFill>
        </Sequence>
        <Sequence from={imagesDuPassage} name="fin">
          <CarteDeFin morceau={morceau} disponible={spec.textes[declinaison.langue].disponible} avecContact={declinaison.avecContact} />
        </Sequence>
      </AbsoluteFill>
    </FournisseurDeMarque>
  );
}
