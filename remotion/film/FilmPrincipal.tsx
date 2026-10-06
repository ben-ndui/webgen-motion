import type { ReactNode } from "react";
import { AbsoluteFill, Sequence } from "remotion";

import { BandeSon } from "./composants/BandeSon";
import { Glissement } from "./composants/Glissement";
import { FournisseurDeMarque } from "./marque/MarqueDuFilm";
import { usePolice } from "./marque/police";
import { imageDuTemps, placerLesPlans } from "./lib/tempo";
import { type IdDePlan, MONTAGES } from "./montages";
import { P1Ouverture } from "./plans/P1Ouverture";
import { P2Probleme } from "./plans/P2Probleme";
import { P3Bascule } from "./plans/P3Bascule";
import { P4Parcours } from "./plans/P4Parcours";
import { P5Evenement } from "./plans/P5Evenement";
import { P6Marque } from "./plans/P6Marque";
import { P7Fin } from "./plans/P7Fin";
import type { DeclinaisonDuFilm, FilmSpec } from "./spec";

// Les inputProps de toutes les compositions du film : la fiche entière, et le
// livrable à rendre. Rien d'autre n'entre dans le film.
export type ProprietesDuFilm = {
  spec: FilmSpec;
  declinaison: DeclinaisonDuFilm;
};

// Durée d'un glissement, en temps de la musique : deux temps, environ 1 s.
const TEMPS_DE_GLISSEMENT = 2;
// La musique s'éteint sur la dernière mesure.
const FONDU_FINAL = 60;

export function FilmPrincipal({ spec, declinaison }: ProprietesDuFilm) {
  const police = usePolice(spec.marque.police);
  const montage = MONTAGES[declinaison.version];
  const tempo = spec.musique.tempo;
  const textes = spec.textes[declinaison.langue];
  const dossier = textes.dossierDesEcrans;
  const places = placerLesPlans(montage.plans, tempo);
  const glissement = imageDuTemps(TEMPS_DE_GLISSEMENT, tempo);

  // Un `Record` sur tous les identifiants : un plan ajouté à la trame sans
  // son rendu ne compile pas.
  const rendu: Record<IdDePlan, ReactNode> = {
    ouverture: <P1Ouverture tempo={tempo} />,
    probleme: <P2Probleme tempo={tempo} textes={textes.probleme} />,
    bascule: <P3Bascule tempo={tempo} textes={textes.bascule} />,
    parcours: (
      <P4Parcours tempo={tempo} legendes={textes.parcours} ecrans={spec.ecrans.parcours} dossierDesEcrans={dossier} />
    ),
    evenement: (
      <P5Evenement tempo={tempo} textes={textes.evenement} etats={spec.ecrans.evenement} dossierDesEcrans={dossier} />
    ),
    marque: <P6Marque tempo={tempo} textes={textes.marque} ecran={spec.ecrans.marque} dossierDesEcrans={dossier} />,
    fin: <P7Fin tempo={tempo} textes={textes.fin} avecContact={declinaison.avecContact} />,
  };

  return (
    <FournisseurDeMarque marque={spec.marque}>
      {/* La police est posée ici, une fois : tous les textes en héritent. */}
      <AbsoluteFill style={{ background: spec.marque.couleurs.encre, fontFamily: police }}>
        <BandeSon musique={spec.musique} fondu={FONDU_FINAL} />
        {places.map((plan, index) => {
          const suivant = places[index + 1];
          const entree = montage.glissements.has(plan.id) ? glissement : 0;
          const sortie = suivant && montage.glissements.has(suivant.id) ? glissement : 0;
          return (
            // Le plan reste affiché pendant la sortie : le suivant se découvre
            // PAR-DESSUS lui, et il faut bien quelque chose dessous.
            <Sequence key={plan.id} from={plan.debut} durationInFrames={plan.duree + sortie} name={plan.id}>
              <Glissement duree={plan.duree} entree={entree} sortie={sortie}>
                {rendu[plan.id]}
              </Glissement>
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </FournisseurDeMarque>
  );
}
