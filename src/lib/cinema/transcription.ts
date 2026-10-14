import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

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

const DOSSIER_DES_MODELES = join(homedir(), ".whisper-models");
// Du plus fidèle au plus léger : on prend le meilleur présent.
const MODELES_PREFERES = ["ggml-medium.bin", "ggml-small.bin", "ggml-base.bin", "ggml-tiny.bin"];
// Sous ce pic, il n'y a pas de voix (une parole lointaine culmine vers -35 dB).
const PIC_MINIMUM_D_UNE_VOIX_DB = -45;

function commandePresente(nom: string): boolean {
  return spawnSync("which", [nom]).status === 0;
}

function modeleDisponible(): { modele: string; detecteur: string | null } | null {
  if (!existsSync(DOSSIER_DES_MODELES)) return null;
  const presents = readdirSync(DOSSIER_DES_MODELES);
  const modele = MODELES_PREFERES.find((nom) => presents.includes(nom));
  if (!modele) return null;
  const detecteur = presents.find((nom) => nom.startsWith("ggml-silero")) ?? null;
  return { modele: join(DOSSIER_DES_MODELES, modele), detecteur: detecteur ? join(DOSSIER_DES_MODELES, detecteur) : null };
}

function picSonore(wav: string): number {
  const sortie = spawnSync("ffmpeg", ["-v", "info", "-i", wav, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf-8" });
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
  const outils = modeleDisponible();
  if (!outils || !commandePresente("whisper-cli")) return null;
  const travail = mkdtempSync(join(tmpdir(), "genmotion-replique-"));
  try {
    const wav = join(travail, "son.wav");
    if (spawnSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-ar", "16000", "-ac", "1", wav]).status !== 0) return "";
    if (picSonore(wav) < PIC_MINIMUM_D_UNE_VOIX_DB) return "";
    // -nt : sans horodatage, whisper rend la ponctuation (convention transcription-locale).
    const options = ["-m", outils.modele, "-l", "fr", "-nt", "-f", wav];
    if (outils.detecteur) options.push("--vad", "-vm", outils.detecteur);
    const sortie = spawnSync("whisper-cli", options, { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 });
    if (sortie.status !== 0) return null;
    return nettoyerLaTranscription(sortie.stdout ?? "");
  } finally {
    rmSync(travail, { recursive: true, force: true });
  }
};
