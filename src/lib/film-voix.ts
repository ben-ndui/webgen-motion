import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import type { FilmSpec } from "../../remotion/film/spec";
import { type ResolvedVoiceBackend, resolveVoiceBackend } from "./config-resolve";
import { enregistrerFilm } from "./film-ecriture";
import { languesDuFilm } from "./film-fiche-depart";
import { chargerFilm, getFilmsDir } from "./film-loader";
import { getFilmPublicDir } from "./film-store";
import { moteurPourLeFilm, reperesMontes } from "./film-voix-plans";
import { getVoCacheDir } from "./motion-tour-store";
import { VOLUME_DE_LA_VOIX_LUFS } from "./film-voix-niveaux";
import { texteAPrononcer } from "./voix/prononciation-film";
import { ensureTts } from "./voix/synthese";
import { ffmpeg, ffprobe } from "./binaires-video";

/**
 * Générer la voix off d'un film : chaque ligne écrite et pas encore générée
 * passe par le moteur de voix des tours (même cache), est copiée dans le
 * dossier du film, mesurée, puis citée par la fiche. SERVEUR SEULEMENT.
 */
export type ResultatDesVoix =
  | { ok: true; generees: number; erreurs: string[] }
  | { ok: false; statut: 404 | 409 | 412; raison: string };

type Synthese = (texte: string, cache: string, moteur: ResolvedVoiceBackend) => Promise<{ mp3Path: string }>;
type Lieux = {
  fiches: string;
  public: (id: string) => string;
  cache: string;
  moteur: () => ResolvedVoiceBackend | null;
  // Le fournisseur de voix (réel par défaut ; un fournisseur local dans les tests).
  synthetiser: Synthese;
};
const LIEUX_PAR_DEFAUT: Lieux = {
  fiches: getFilmsDir(),
  public: getFilmPublicDir,
  cache: getVoCacheDir(),
  moteur: () => resolveVoiceBackend(),
  synthetiser: (texte, cache, moteur) => ensureTts(texte, cache, moteur),
};

export function dureeDeLAudio(chemin: string): number | null {
  const sortie = spawnSync(ffprobe(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", chemin], { encoding: "utf-8" });
  const duree = Number.parseFloat(sortie.stdout);
  return sortie.status === 0 && duree > 0 ? Math.round(duree * 100) / 100 : null;
}

// Les voix de synthèse sortent vers -20 LUFS et les musiques du commerce
// vers -10 : on remonte chaque voix (niveaux mesurés : film-voix-niveaux.ts).
export { VOLUME_DE_LA_VOIX_LUFS } from "./film-voix-niveaux";

/** Copie la voix dans le film à un volume constant et audible. */
export function normaliserLaVoix(source: string, destination: string): boolean {
  const sortie = spawnSync(ffmpeg(), [
    "-v", "error", "-y", "-i", source,
    "-af", `loudnorm=I=${VOLUME_DE_LA_VOIX_LUFS}:TP=-1.5:LRA=11`,
    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", destination,
  ]);
  return sortie.status === 0;
}

export async function genererLesVoix(id: string, partiel: Partial<Lieux> = {}): Promise<ResultatDesVoix> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };
  const moteur = lieux.moteur();
  if (!moteur) {
    return { ok: false, statut: 412, raison: "Aucune voix n'est réglée : ouvre les Réglages de GEN MOTION (voix Google, ElevenLabs ou Voicebox)." };
  }
  const spec: FilmSpec = structuredClone(fiche.spec);
  const dossierPublic = lieux.public(id);
  mkdirSync(lieux.cache, { recursive: true });
  let generees = 0;
  const erreurs: string[] = [];

  for (const langue of languesDuFilm(spec)) {
    const montes = new Set(reperesMontes(spec, langue).map((r) => r.cle));
    for (const ligne of spec.voix?.lignes[langue] ?? []) {
      const dejaLa = ligne.fichier && existsSync(join(dossierPublic, ligne.fichier));
      // Un plan absent des montages rendus ne serait jamais entendu.
      if (dejaLa || !ligne.texte.trim() || !montes.has(ligne.repere)) continue;
      try {
        const voix = await lieux.synthetiser(texteAPrononcer(ligne.texte), lieux.cache, moteurPourLeFilm(moteur, langue, spec.direction, spec.voix?.genre));
        // Le nom du fichier en cache est une empreinte du texte et de la voix :
        // un texte changé donne un nouveau fichier, jamais l'ancien son.
        const relatif = `voix/${langue}/${ligne.repere.replaceAll(".", "-")}-${basename(voix.mp3Path)}`;
        const destination = join(dossierPublic, relatif);
        mkdirSync(dirname(destination), { recursive: true });
        if (!normaliserLaVoix(voix.mp3Path, destination)) throw new Error("la voix n'a pas pu être mise au bon volume");
        const duree = dureeDeLAudio(destination);
        if (!duree) throw new Error("fichier audio illisible");
        ligne.fichier = relatif;
        ligne.duree = duree;
        generees += 1;
      } catch (erreur) {
        erreurs.push(`${langue.toUpperCase()} · ${ligne.repere} : ${(erreur as Error).message}`);
      }
    }
  }
  if (generees > 0) {
    const ecriture = enregistrerFilm(id, spec, lieux.fiches);
    if (!ecriture.ok) return { ok: false, statut: 409, raison: ecriture.raison };
  }
  return { ok: true, generees, erreurs };
}
