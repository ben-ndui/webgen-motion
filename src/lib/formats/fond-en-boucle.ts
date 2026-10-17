import { spawnSync } from "node:child_process";

import { ffmpeg, ffprobe } from "../binaires-video";

/**
 * Prépare un décor Veo pour tourner en boucle sur tout un morceau. Deux défauts
 * relevés au premier décor réel (17/10/2026) :
 * - la première demi-seconde portait un faux sous-titre inventé par Veo, qui
 *   serait revenu à chaque tour : on la coupe ;
 * - la dernière image ne ressemble pas à la première, le raccord sautait :
 *   la dernière seconde se fond dans le début, la boucle n'a plus de couture.
 */
export const DEBUT_COUPE_S = 0.5;
export const FONDU_S = 1;

function dureeDe(fichier: string): number {
  const sortie = spawnSync(ffprobe(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fichier], { encoding: "utf-8" });
  return Number(sortie.stdout);
}

/** Écrit `sortie` à partir de `entree` ; faux si la vidéo est trop courte ou si ffmpeg échoue. */
export function mettreEnBoucle(entree: string, sortie: string): boolean {
  const utile = dureeDe(entree) - DEBUT_COUPE_S;
  if (!Number.isFinite(utile) || utile < FONDU_S * 3) return false;
  // corps = [FONDU, fin] ; debut = [0, FONDU]. Le corps finit en se fondant dans
  // le début : la dernière image rendue est celle qui ouvre le corps.
  const filtre = [
    `[0:v]trim=start=${DEBUT_COUPE_S},setpts=PTS-STARTPTS,split[a][b]`,
    `[a]trim=start=${FONDU_S},setpts=PTS-STARTPTS[corps]`,
    `[b]trim=end=${FONDU_S},setpts=PTS-STARTPTS[debut]`,
    `[corps][debut]xfade=transition=fade:duration=${FONDU_S}:offset=${utile - 2 * FONDU_S},format=yuv420p[v]`,
  ].join(";");
  const resultat = spawnSync(ffmpeg(), ["-v", "error", "-y", "-i", entree, "-filter_complex", filtre, "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart", sortie]);
  return resultat.status === 0;
}
