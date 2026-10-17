import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Où trouver whisper.cpp (`whisper-cli`) et son modèle, pour tout le code
 * serveur. Même piège que ffmpeg (binaires-video.ts) : lancée depuis le
 * Finder, l'app n'a pas Homebrew dans son PATH, et `which whisper-cli`
 * répondait « absent » sur une machine qui l'a. On cherche donc aux endroits
 * où Homebrew l'installe, et WEBGEN_WHISPER_BIN l'emporte sur tout.
 */

const EMPLACEMENTS = ["/opt/homebrew/bin/whisper-cli", "/usr/local/bin/whisper-cli"];
/** Calculé à chaque appel (HOME du moment) : un test qui change de maison ne lit pas la vraie. */
export function dossierDesModeles(): string {
  return join(homedir(), ".whisper-models");
}
// Du plus fidèle au plus léger : on prend le meilleur présent.
const MODELES_PREFERES = ["ggml-medium.bin", "ggml-small.bin", "ggml-base.bin", "ggml-tiny.bin"];

export type OutilsWhisper = { ok: true; cli: string; modele: string; detecteur: string | null } | { ok: false; raison: string };

export function outilsWhisper(env: Record<string, string | undefined> = process.env, existe: (chemin: string) => boolean = existsSync): OutilsWhisper {
  const cli = env.WEBGEN_WHISPER_BIN?.trim() || EMPLACEMENTS.find(existe);
  if (!cli) return { ok: false, raison: "whisper.cpp n'est pas installé : dans un terminal, « brew install whisper-cpp »." };
  const dossier = dossierDesModeles();
  const sansModele = { ok: false as const, raison: "Aucun modèle whisper : télécharge-le dans Réglages › Écoute locale." };
  if (!existe(dossier)) return sansModele;
  const presents = readdirSync(dossier);
  const modele = MODELES_PREFERES.find((nom) => presents.includes(nom));
  if (!modele) return sansModele;
  const detecteur = presents.find((nom) => nom.startsWith("ggml-silero")) ?? null;
  return { ok: true, cli, modele: join(dossier, modele), detecteur: detecteur ? join(dossier, detecteur) : null };
}
