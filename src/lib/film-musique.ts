import { spawnSync } from "node:child_process";

import { affinerLeTempo, enveloppeDAttaques, estimerLeTempo } from "./film-rythme";

/**
 * Mesure le tempo et le premier temps d'un morceau déposé, pour que le
 * montage tombe sur la musique sans que personne n'ait à les connaître.
 * SERVEUR SEULEMENT (lance ffmpeg).
 *
 * Mono 8 kHz : largement assez pour entendre une grosse caisse, et un
 * morceau de 3 min s'analyse en quelques secondes.
 */
const FREQUENCE = 8000;
const FENETRE = 128;
const FENETRES_PAR_SECONDE = FREQUENCE / FENETRE;
// Moins que ça, il n'y a pas de quoi tenir un film (et l'analyse ment).
export const DUREE_MINIMUM_SEC = 20;

export type MesureDeLaMusique =
  | { ok: true; tempo: number; premierTemps: number; dureeSec: number }
  | { ok: false; raison: string };

function decoder(chemin: string): Float32Array | null {
  const sortie = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", chemin, "-ac", "1", "-ar", String(FREQUENCE), "-f", "f32le", "-"],
    { maxBuffer: 1024 * 1024 * 512 },
  );
  if (sortie.status !== 0 || !sortie.stdout) return null;
  const octets = sortie.stdout;
  return new Float32Array(octets.buffer, octets.byteOffset, Math.floor(octets.byteLength / 4));
}

export function mesurerMusique(chemin: string): MesureDeLaMusique {
  const echantillons = decoder(chemin);
  if (!echantillons) return { ok: false, raison: "Ce fichier ne se lit pas comme de l'audio" };
  const dureeSec = echantillons.length / FREQUENCE;
  if (dureeSec < DUREE_MINIMUM_SEC) {
    return { ok: false, raison: `Morceau trop court (${Math.round(dureeSec)} s) : il en faut au moins ${DUREE_MINIMUM_SEC}` };
  }
  const { attaques } = enveloppeDAttaques(echantillons, FENETRE);
  if (!attaques.some((attaque) => attaque > 0)) return { ok: false, raison: "Ce morceau est silencieux" };
  const approche = estimerLeTempo(attaques, FENETRES_PAR_SECONDE);
  const { tempo, decalage } = affinerLeTempo(attaques, FENETRES_PAR_SECONDE, approche);
  return { ok: true, tempo, premierTemps: Math.round(decalage * 1000) / 1000, dureeSec: Math.round(dureeSec * 10) / 10 };
}
