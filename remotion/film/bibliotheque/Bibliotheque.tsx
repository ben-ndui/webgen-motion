import type { ReactNode } from "react";
import { AbsoluteFill, Sequence } from "remotion";

import { BandeSon } from "../composants/BandeSon";
import { Glissement } from "../composants/Glissement";
import type { ProprietesDuFilm } from "../FilmPrincipal";
import { FournisseurDeMarque } from "../marque/MarqueDuFilm";
import { DIRECTION_PAR_DEFAUT, fondDuFilm } from "../marque/direction";
import { usePolice } from "../marque/police";
import { imageDuTemps, placerLesPlans } from "../lib/tempo";
import { type IdDePlanDeBibliotheque, MONTAGE_DE_LA_BIBLIOTHEQUE } from "./montage";
import { PBarreAdresse } from "./PBarreAdresse";
import { PEventail } from "./PEventail";
import { PLogoConstruit } from "./PLogoConstruit";
import { PTypoCinetique } from "./PTypoCinetique";

const TEMPS_DE_GLISSEMENT = 2;
const FONDU_FINAL = 60;

/**
 * Les plans de la bibliothèque, enchaînés sur la musique du film. Mêmes
 * inputProps que le film ({ spec, declinaison }) : un outil qui sait rendre
 * le film sait rendre la bibliothèque. La fiche doit avoir une
 * `bibliotheque` (Root ne crée cette composition qu'à cette condition).
 */
export function Bibliotheque({ spec, declinaison }: ProprietesDuFilm) {
  const police = usePolice(spec.marque.police);
  const bibliotheque = spec.bibliotheque;
  const textes = spec.textes[declinaison.langue];
  const textesDeLaBibliotheque = textes.bibliotheque;
  if (!bibliotheque || !textesDeLaBibliotheque) {
    throw new Error("Bibliotheque : la fiche n'a pas de « bibliotheque » (voir validerBibliotheque).");
  }
  const tempo = spec.musique.tempo;
  const dossier = textes.dossierDesEcrans;
  const places = placerLesPlans(MONTAGE_DE_LA_BIBLIOTHEQUE.plans, tempo);
  const glissement = imageDuTemps(TEMPS_DE_GLISSEMENT, tempo);
  const glissements = MONTAGE_DE_LA_BIBLIOTHEQUE.glissements;

  // Un `Record` sur tous les identifiants : un plan ajouté au montage sans
  // son rendu ne compile pas.
  const rendu: Record<IdDePlanDeBibliotheque, ReactNode> = {
    typo: <PTypoCinetique tempo={tempo} textes={textesDeLaBibliotheque} />,
    adresse: (
      <PBarreAdresse tempo={tempo} adresse={bibliotheque.adresse} ecran={`${dossier}/${bibliotheque.ecranDeLAdresse}`} />
    ),
    eventail: (
      <PEventail
        tempo={tempo}
        ecrans={bibliotheque.eventail.map((ecran) => `${dossier}/${ecran}`)}
        legendes={textesDeLaBibliotheque.legendesEventail}
      />
    ),
    logo: <PLogoConstruit tempo={tempo} signature={textesDeLaBibliotheque.signature} />,
  };

  return (
    <FournisseurDeMarque marque={spec.marque} direction={spec.direction}>
      <AbsoluteFill style={{ background: fondDuFilm(spec.direction ?? DIRECTION_PAR_DEFAUT, spec.marque.couleurs), fontFamily: police }}>
        <BandeSon musique={spec.musique} fondu={FONDU_FINAL} />
        {places.map((plan, index) => {
          const suivant = places[index + 1];
          const entree = glissements.has(plan.id) ? glissement : 0;
          const sortie = suivant && glissements.has(suivant.id) ? glissement : 0;
          return (
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
