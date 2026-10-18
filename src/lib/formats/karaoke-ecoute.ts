import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type LigneCalee, type MotEntendu, calerLesParoles, estUnMarqueur, recalerSurLesFenetres } from "../../../remotion/film/karaoke/alignement";
import { ffmpeg, ffprobe } from "../binaires-video";
import type { OutilsWhisper } from "../whisper";

/**
 * Écouter le morceau d'un karaoké avec whisper, EN LOCAL (le morceau ne part
 * sur aucun service en ligne). Méthode du gabarit film-motion
 * (scripts/caler-paroles.mjs, conventions/transcription-locale.md du brain) :
 * - le BROUILLON : une ligne par phrase entendue, que l'artiste corrige ;
 * - le CALAGE : les mots ÉCRITS par l'artiste reçoivent les temps entendus,
 *   recalés sur des écoutes de 10 s (sur un morceau entier, whisper dérive).
 * SERVEUR SEULEMENT.
 */

type Whisper = Extract<OutilsWhisper, { ok: true }>;
export type Journal = (ligne: string) => void;
export const SEUIL_DE_RECONNAISSANCE = 0.5;

function versUnWav(morceau: string, dossier: string): string {
  const wav = join(dossier, "morceau.wav");
  const sortie = spawnSync(ffmpeg(), ["-v", "error", "-y", "-i", morceau, "-ar", "16000", "-ac", "1", wav]);
  if (sortie.status !== 0) throw new Error("Ce morceau ne se lit pas comme de l'audio.");
  return wav;
}

/** Une écoute ; `parMot` : un segment par mot ; `fenetre` : [début, durée] en secondes. */
function ecouter(outils: Whisper, wav: string, dossier: string, langue: string, parMot: boolean, fenetre?: [number, number]): MotEntendu[] {
  const sortie = join(dossier, `${parMot ? "mots" : "phrases"}${fenetre ? `-${fenetre[0]}` : ""}`);
  const options = ["-m", outils.modele, "-l", langue, ...(parMot ? ["-ml", "1", "-sow"] : [])];
  if (fenetre) options.push("-ot", String(fenetre[0] * 1000), "-d", String(fenetre[1] * 1000));
  const resultat = spawnSync(outils.cli, [...options, "-oj", "-of", sortie, "-f", wav], { stdio: "ignore" });
  if (resultat.status !== 0) throw new Error("whisper n'a pas pu écouter le morceau.");
  const { transcription } = JSON.parse(readFileSync(`${sortie}.json`, "utf-8")) as { transcription: { text: string; offsets: { from: number; to: number } }[] };
  return transcription
    .map((s) => ({ texte: s.text.trim(), debut: s.offsets.from / 1000, fin: s.offsets.to / 1000 }))
    .filter((s) => !estUnMarqueur(s.texte));
}

function dansUnDossierJetable<T>(travail: (dossier: string) => T): T {
  const dossier = mkdtempSync(join(tmpdir(), "genmotion-karaoke-"));
  try {
    return travail(dossier);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

/** Le brouillon des paroles : une ligne par phrase entendue. Vide = aucune voix entendue. */
export function ecrireLeBrouillon(outils: Whisper, morceau: string, langue: string, journal: Journal): string[] {
  return dansUnDossierJetable((dossier) => {
    journal("Écoute du morceau…");
    return ecouter(outils, versUnWav(morceau, dossier), dossier, langue, false).map((phrase) => phrase.texte);
  });
}

/** Les paroles écrites par l'artiste, calées mot à mot sur ce que whisper entend. */
export function calerLesParolesDuMorceau(
  outils: Whisper,
  morceau: string,
  lignes: string[],
  langue: string,
  journal: Journal,
): { lignes: LigneCalee[]; reconnus: number } {
  return dansUnDossierJetable((dossier) => {
    const wav = versUnWav(morceau, dossier);
    const duree = Number(spawnSync(ffprobe(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav], { encoding: "utf-8" }).stdout);
    journal("Écoute du morceau entier…");
    const base = ecouter(outils, wav, dossier, langue, true);
    const fenetres = [];
    for (let debut = 0; debut < duree; debut += 5) {
      journal(`Écoute fine : ${Math.round((debut / duree) * 100)} %`);
      fenetres.push({ debut, fin: debut + 10, mots: ecouter(outils, wav, dossier, langue, true, [debut, 10]) });
    }
    return calerLesParoles(lignes, recalerSurLesFenetres(base, fenetres));
  });
}
