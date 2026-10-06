import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";

import type { MusiqueDuFilm } from "../spec";

type Props = {
  musique: MusiqueDuFilm;
  // Durée du fondu de sortie, en images : le film s'arrête au milieu du
  // morceau, une coupe sèche sonnerait comme un bug.
  fondu: number;
};

/**
 * La musique du film, recalée sur son premier temps et fondue à la fin.
 */
export function BandeSon({ musique, fondu }: Props) {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <Audio
      src={staticFile(musique.fichier)}
      trimBefore={Math.round(musique.premierTemps * fps)}
      volume={(image) =>
        interpolate(image, [durationInFrames - fondu, durationInFrames - 1], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
}
