import { type CalculateMetadataFunction, Composition } from "remotion";

import { Bibliotheque } from "./bibliotheque/Bibliotheque";
import { dureeDeLaBibliotheque } from "./bibliotheque/montage";
import { erreursDeLaBibliotheque } from "./bibliotheque/validerBibliotheque";
import { Episode, type ProprietesDeLEpisode } from "./cinema/Episode";
import { monterLEpisode } from "./cinema/montage";
import { erreursDuCinema } from "./cinema/validerCinema";
import { FILM } from "./film";
import { FilmPrincipal, type ProprietesDuFilm } from "./FilmPrincipal";
import { IMAGES_PAR_SECONDE } from "./lib/tempo";
import { dureeDuFilm } from "./montages";
import type { VersionDuFilm } from "./spec";
import { validerSpec } from "./validerSpec";

// Repris de `src/Root.tsx` du gabarit film-motion (brain, commit cab1252) :
// seules les compositions génériques `Film` et `Bibliotheque` vivent dans
// GenMotion. La fiche arrive en inputProps au rendu (`scripts/render-film.ts` :
// { spec, declinaison }).

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

// Même règle pour la bibliothèque, avec sa propre validation en plus : une
// fiche sans bloc `bibliotheque` (ou mal rempli) échoue ici, avec la liste.
export const metadonneesDeLaBibliotheque: CalculateMetadataFunction<ProprietesDuFilm> = ({ props }) => {
  const spec = validerSpec(props.spec);
  const erreurs = erreursDeLaBibliotheque(spec);
  if (!spec.bibliotheque) erreurs.push("la fiche n'a pas de « bibliotheque »");
  if (erreurs.length > 0) {
    throw new Error(`Bibliothèque invalide (${erreurs.length}) :\n  - ${erreurs.join("\n  - ")}`);
  }
  return {
    ...CADRES[props.declinaison.version],
    durationInFrames: dureeDeLaBibliotheque(spec.musique.tempo),
  };
};

// Un épisode de la série : toujours vertical (Veo rend du 9:16), sa durée
// suit ses plans et leur découpe. Plan sans vidéo ou série mal remplie :
// échec ici, avec la liste.
export const metadonneesDeLEpisode: CalculateMetadataFunction<ProprietesDeLEpisode> = ({ props }) => {
  const spec = validerSpec(props.spec);
  const erreurs = erreursDuCinema(spec);
  if (!spec.cinema) erreurs.push("la fiche n'a pas de série (« cinema »)");
  if (erreurs.length > 0) throw new Error(`Série invalide (${erreurs.length}) :\n  - ${erreurs.join("\n  - ")}`);
  const montage = monterLEpisode(spec.cinema!, props.episode, spec.musique.tempo, IMAGES_PAR_SECONDE);
  return { ...CADRES.court, durationInFrames: montage.duree };
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
    <>
      <Composition
        id="Film"
        component={FilmPrincipal}
        {...CADRES[premiere.version]}
        fps={IMAGES_PAR_SECONDE}
        durationInFrames={1}
        defaultProps={{ spec: FILM, declinaison: premiere }}
        calculateMetadata={metadonneesDuFilm}
      />
      {/* Les plans de la bibliothèque de la fiche (render-film.ts --bibliotheque). */}
      <Composition
        id="Bibliotheque"
        component={Bibliotheque}
        {...CADRES[premiere.version]}
        fps={IMAGES_PAR_SECONDE}
        durationInFrames={1}
        defaultProps={{ spec: FILM, declinaison: premiere }}
        calculateMetadata={metadonneesDeLaBibliotheque}
      />
      {/* Un épisode de la série (render-film.ts --episode <id>). */}
      <Composition
        id="Episode"
        component={Episode}
        {...CADRES.court}
        fps={IMAGES_PAR_SECONDE}
        durationInFrames={1}
        defaultProps={{ spec: FILM, declinaison: premiere, episode: "" }}
        calculateMetadata={metadonneesDeLEpisode}
      />
    </>
  );
}
