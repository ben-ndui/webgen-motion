import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpeg } from "../binaires-video";
import { outilsWhisper } from "../whisper";

/**
 * Entendre ce que dit un plan, en local et gratuitement (whisper.cpp). Rend
 * le texte entendu, "" s'il n'y a pas de voix, ou null si la transcription
 * est impossible sur cette machine (whisper ou son modèle absents).
 * SERVEUR SEULEMENT.
 *
 * whisper INVENTE du texte sur une piste sans voix (« Merci d'avoir regardé
 * cette vidéo ! ») : les filets de conventions/transcription-locale.md passent
 * avant de croire ce qu'il dit.
 */
export type Transcrire = (video: string) => string | null;

// Sous ce pic, il n'y a pas de voix (une parole lointaine culmine vers -35 dB).
const PIC_MINIMUM_D_UNE_VOIX_DB = -45;

function picSonore(wav: string): number {
  const sortie = spawnSync(ffmpeg(), ["-v", "info", "-i", wav, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf-8" });
  const trouve = /max_volume:\s*(-?[\d.]+) dB/.exec(sortie.stderr ?? "");
  return trouve ? Number.parseFloat(trouve[1]) : -Infinity;
}

/** Retire ce que whisper ajoute quand il n'entend personne : [Musique], (rires), *…*, ♪. */
export function nettoyerLaTranscription(texte: string): string {
  return texte
    .replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const transcrireAvecWhisper: Transcrire = (video) => {
  // Trouvé à son emplacement, jamais par le PATH (absent de Homebrew dans l'app lancée du Finder).
  const outils = outilsWhisper();
  if (!outils.ok) return null;
  const travail = mkdtempSync(join(tmpdir(), "genmotion-replique-"));
  try {
    const wav = join(travail, "son.wav");
    if (spawnSync(ffmpeg(), ["-v", "error", "-y", "-i", video, "-ar", "16000", "-ac", "1", wav]).status !== 0) return "";
    if (picSonore(wav) < PIC_MINIMUM_D_UNE_VOIX_DB) return "";
    // -nt : sans horodatage, whisper rend la ponctuation (convention transcription-locale).
    const options = ["-m", outils.modele, "-l", "fr", "-nt", "-f", wav];
    if (outils.detecteur) options.push("--vad", "-vm", outils.detecteur);
    const sortie = spawnSync(outils.cli, options, { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 });
    if (sortie.status !== 0) return null;
    return nettoyerLaTranscription(sortie.stdout ?? "");
  } finally {
    rmSync(travail, { recursive: true, force: true });
  }
};
