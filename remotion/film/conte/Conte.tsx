import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

import { BandeSon } from "../composants/BandeSon";
import { VoixOff, voixPlacees } from "../composants/VoixOff";
import { FournisseurDeMarque } from "../marque/MarqueDuFilm";
import { usePolice } from "../marque/police";
import { useFormat } from "../lib/format";
import { progression } from "../lib/mouvement";
import { IMAGES_PAR_SECONDE, imageDuTemps, placerLesPlans } from "../lib/tempo";
import type { DeclinaisonDuFilm } from "../spec";
import { Compteur } from "./composants/Compteur";
import { Decor } from "./composants/Decor";
import { Personnages } from "./composants/Personnages";
import { TextesDuPlan } from "./composants/TextesDuPlan";
import { instantsDuConte } from "./instants";
import type { ConteSpec } from "./spec";
import { SAUF, plansDuConte } from "./trame";

export type ProprietesDuConte = { spec: ConteSpec; declinaison: DeclinaisonDuFilm };

const FONDU_FINAL = 60;

/**
 * Un conte à compteur : UN décor sur toute la vidéo, le héros et ses objets
 * réglés sur les instants de la trame, et les mots de chaque plan par-dessus.
 */
export function Conte({ spec, declinaison }: ProprietesDuConte) {
  const police = usePolice(spec.marque.police);
  const format = useFormat();
  const image = useCurrentFrame();
  const tempo = spec.musique.tempo;
  const textes = spec.textes[declinaison.langue];
  const places = placerLesPlans(plansDuConte(spec, declinaison.langue), tempo);
  const instant = instantsDuConte(places, tempo);
  const teinte = progression(image, instant("sauf", SAUF.fonte), imageDuTemps(SAUF.dureeDeFonte, tempo));
  const reperes = places.map((p) => ({ cle: p.id.replace("avantage-", "avantage."), plan: p.id, temps: 0, texte: "" }));
  const voix = voixPlacees(spec.voix?.lignes[declinaison.langue] ?? [], reperes, places, tempo, IMAGES_PAR_SECONDE);

  return (
    <FournisseurDeMarque marque={spec.marque}>
      <AbsoluteFill style={{ fontFamily: police }}>
        <BandeSon musique={spec.musique} fondu={FONDU_FINAL} voix={voix} sousLaVoix={spec.voix?.musiqueSousLaVoix} />
        <VoixOff voix={voix} />
        <Decor format={format} teinte={teinte} />
        <Personnages
          heros={spec.heros}
          objets={spec.objets}
          avantages={textes.avantages.length}
          tampon={textes.tampon}
          format={format}
          tempo={tempo}
          instant={instant}
        />
        <Compteur
          compteur={spec.compteur}
          objets={spec.objets.length}
          libelle={textes.libelleCompteur}
          unite={textes.unite}
          langue={declinaison.langue}
          format={format}
          instant={instant}
        />
        {places.map((plan) => (
          <Sequence key={plan.id} from={plan.debut} durationInFrames={plan.duree} name={plan.id}>
            <TextesDuPlan plan={plan.id} textes={textes} format={format} tempo={tempo} avecContact={declinaison.avecContact} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </FournisseurDeMarque>
  );
}
