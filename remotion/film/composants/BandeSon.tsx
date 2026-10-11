import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";

import { type Intervalle, facteurDeSourdine } from "../lib/sourdine";
import type { MusiqueDuFilm } from "../spec";

type Props = {
  musique: MusiqueDuFilm;
  // Durée du fondu de sortie, en images : le film s'arrête au milieu du
  // morceau, une coupe sèche sonnerait comme un bug.
  fondu: number;
  // Les moments où une voix parle (en images) et le volume de la musique à ces moments.
  voix?: Intervalle[];
  sousLaVoix?: number;
};

/**
 * La musique du film, recalée sur son premier temps, baissée sous la voix
 * off et fondue à la fin.
 */
export function BandeSon({ musique, fondu, voix = [], sousLaVoix = 1 }: Props) {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <Audio
      src={staticFile(musique.fichier)}
      trimBefore={Math.round(musique.premierTemps * fps)}
      volume={(image) =>
        (musique.volume ?? 1) *
        facteurDeSourdine(image, voix, sousLaVoix) *
        interpolate(image, [durationInFrames - fondu, durationInFrames - 1], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
}
