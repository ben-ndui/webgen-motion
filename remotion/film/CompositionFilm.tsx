import { type CalculateMetadataFunction, Composition } from "remotion";

import { FILM } from "./film";
import { FilmPrincipal, type ProprietesDuFilm } from "./FilmPrincipal";
import { IMAGES_PAR_SECONDE } from "./lib/tempo";
import { dureeDuFilm } from "./montages";
import type { VersionDuFilm } from "./spec";
import { validerSpec } from "./validerSpec";

// Repris de `src/Root.tsx` du gabarit film-motion (brain, commit cab1252) :
// seule la composition générique `Film` vit dans GenMotion. La fiche arrive
// en inputProps au rendu (`scripts/render-film.ts` : { spec, declinaison }).

export const CADRES: Record<VersionDuFilm, { width: number; height: number }> = {
  long: { width: 1920, height: 1080 },
  court: { width: 1080, height: 1920 },
};

// Durée et cadre se calculent sur la fiche REÇUE, pas sur celle du fichier :
// une fiche passée en inputProps au rendu avec un autre tempo ou une autre
// version donne la bonne durée. La fiche est validée ici, avant le premier
// plan : une erreur liste tous les champs fautifs.
export const metadonneesDuFilm: CalculateMetadataFunction<ProprietesDuFilm> = ({ props }) => {
  const spec = validerSpec(props.spec);
  return {
    ...CADRES[props.declinaison.version],
    durationInFrames: dureeDuFilm(props.declinaison.version, spec.musique.tempo),
  };
};

/**
 * Point d'entrée du mode « Film de marque » : inputProps = { spec, declinaison }.
 * Les props par défaut (la fiche d'exemple du gabarit) ne servent qu'au
 * Studio Remotion ; un vrai rendu passe toujours par `render-film.ts`.
 */
export function CompositionFilm() {
  const premiere = FILM.declinaisons[0];
  if (!premiere) return null;
  return (
    <Composition
      id="Film"
      component={FilmPrincipal}
      {...CADRES[premiere.version]}
      fps={IMAGES_PAR_SECONDE}
      durationInFrames={1}
      defaultProps={{ spec: FILM, declinaison: premiere }}
      calculateMetadata={metadonneesDuFilm}
    />
  );
}
