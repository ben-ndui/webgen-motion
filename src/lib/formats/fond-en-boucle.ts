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

/**
 * Au-delà de cet écart moyen (niveaux de gris, 0 à 255) entre la première image et la
 * dernière avant le fondu, la boucle se voit : le décor « raconte une action ». Calé le
 * 17/10/2026 sur des décors réels : route de nuit 5,7 et 16,2, néons et fumée 24, mur
 * de blocs qui s'effondre 58,7 (le fondu le faisait revenir intact à chaque tour).
 */
export const SEUIL_DE_BOUCLE = 40;

function imageGrise(fichier: string, instant: number): Buffer {
  const sortie = spawnSync(ffmpeg(), ["-v", "error", "-ss", String(instant), "-i", fichier, "-vf", "scale=64:36,format=gray", "-frames:v", "1", "-f", "rawvideo", "-"]);
  return sortie.stdout ?? Buffer.alloc(0);
}

/** L'écart entre le début de la boucle et l'image juste avant le fondu ; null si illisible. */
export function ecartDeBoucle(fichier: string): number | null {
  const duree = dureeDe(fichier);
  if (!Number.isFinite(duree) || duree <= FONDU_S) return null;
  const debut = imageGrise(fichier, 0);
  const avantLeFondu = imageGrise(fichier, Math.max(0, duree - FONDU_S - 0.1));
  if (debut.length === 0 || debut.length !== avantLeFondu.length) return null;
  let somme = 0;
  for (let i = 0; i < debut.length; i++) somme += Math.abs(debut[i] - avantLeFondu[i]);
  return somme / debut.length;
}

export type QualiteDeBoucle = "propre" | "action" | "inconnue";

export function qualiteDeBoucle(fichier: string): QualiteDeBoucle {
  const ecart = ecartDeBoucle(fichier);
  if (ecart === null) return "inconnue";
  return ecart > SEUIL_DE_BOUCLE ? "action" : "propre";
}
