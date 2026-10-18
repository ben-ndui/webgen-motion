import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { ffmpeg } from "../binaires-video";
import { type ParolesAlignees, alignerLesParoles } from "./aligner-les-paroles";
import { TAUX, ecouterParFenetres, ecouteurOnnx } from "./ecoute-onnx";
import { ALPHABET_FRANCAIS, MODELE_FRANCAIS } from "./modele-francais";

/**
 * Le calage par ALIGNEMENT FORCÉ d'un morceau, de bout en bout : le morceau en
 * onde 16 kHz (ffmpeg), l'écoute par le modèle, puis les paroles posées dessus.
 * EN LOCAL, SERVEUR SEULEMENT. Seul le français a son modèle pour l'instant :
 * les autres langues gardent le calage par whisper (karaoke-ecoute.ts).
 */

/** Calculé à chaque appel (HOME du moment), comme le dossier des modèles whisper. */
export function dossierDesModelesDAlignement(): string {
  return join(homedir(), ".webgen-motion", "modeles");
}

export function cheminDuModeleDAlignement(langue: string, dossier: string = dossierDesModelesDAlignement()): string | null {
  if (langue !== MODELE_FRANCAIS.langue) return null;
  const chemin = join(dossier, MODELE_FRANCAIS.fichier);
  return existsSync(chemin) ? chemin : null;
}

function ondeDuMorceau(morceau: string): Float32Array {
  const sortie = spawnSync(ffmpeg(), ["-v", "error", "-i", morceau, "-ar", String(TAUX), "-ac", "1", "-f", "f32le", "-"], {
    maxBuffer: 1024 * 1024 * 1024,
  });
  // ffmpeg qui ne démarre pas, ou un son trop long pour le tampon (plus de 4 h) : ce n'est pas la faute du morceau.
  if (sortie.error) throw new Error(`ffmpeg n'a pas pu lire le morceau (${sortie.error.message}).`);
  if (sortie.status !== 0 || sortie.stdout.length < 4) throw new Error("Ce morceau ne se lit pas comme de l'audio.");
  // Copie : le tampon de Node peut commencer à un octet non multiple de 4.
  const octets = sortie.stdout.subarray(0, sortie.stdout.length - (sortie.stdout.length % 4));
  return new Float32Array(new Uint8Array(octets).buffer);
}

export async function calerParAlignement(
  cheminDuModele: string,
  morceau: string,
  lignes: string[],
  journal: (ligne: string) => void,
): Promise<ParolesAlignees> {
  journal("Écoute du morceau (alignement mot à mot)…");
  const onde = ondeDuMorceau(morceau);
  const ecouteur = await ecouteurOnnx(cheminDuModele, MODELE_FRANCAIS.classes);
  const avancer = (fraction: number) => journal(`Écoute fine : ${Math.round(fraction * 100)} %`);
  const { emission, secondesParTrame } = await ecouterParFenetres(onde, ecouteur, MODELE_FRANCAIS.echantillonsParTrame, avancer);
  journal("Écoute : pose des paroles…");
  return alignerLesParoles(lignes, emission, secondesParTrame, { alphabet: ALPHABET_FRANCAIS, blanc: MODELE_FRANCAIS.blanc });
}
