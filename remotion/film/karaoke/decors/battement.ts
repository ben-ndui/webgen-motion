import { useCurrentFrame, useVideoConfig } from "remotion";

export type PropsDuDecor = { tempo: number; premierTemps: number; debutDuPassage: number };

/**
 * Où en est le MORCEAU (pas la vidéo) : un décor reste calé sur le temps même
 * si le passage commence au milieu. `battement` vaut 1 sur le temps et
 * retombe vite à 0 : de quoi faire pulser un élément sans le faire trembler.
 */
export function useBattement({ tempo, premierTemps, debutDuPassage }: PropsDuDecor) {
  const image = useCurrentFrame();
  const { fps } = useVideoConfig();
  const secondes = debutDuPassage + image / fps;
  const temps = Math.max(0, ((secondes - premierTemps) * tempo) / 60);
  const indexDuTemps = Math.floor(temps);
  const dansLeTemps = temps - indexDuTemps;
  return { secondes, temps, indexDuTemps, dansLeTemps, battement: Math.max(0, 1 - dansLeTemps * 4) };
}

/** Une suite pseudo-aléatoire FIXE : le même décor à chaque rendu. */
export function aleatoireFixe(graine: number): () => number {
  let etat = graine;
  return () => {
    etat = (etat * 16807) % 2147483647;
    return etat / 2147483647;
  };
}
