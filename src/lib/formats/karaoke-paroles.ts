import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { type Passage, passageDuRefrain } from "../../../remotion/film/karaoke/lecture";
import type { ParolesDuKaraoke } from "../../../remotion/film/karaoke/spec";

/**
 * Les fichiers de paroles d'un karaoké, dans le dossier public du projet :
 * le brouillon de whisper, le texte écrit par l'artiste, et les paroles
 * calées (au chemin que cite la fiche, `spec.paroles`). SERVEUR SEULEMENT.
 */

export const CHEMINS_DES_PAROLES = { brouillon: "paroles/brouillon.txt", texte: "paroles/paroles.txt", calees: "paroles/paroles.json" } as const;
export const LONGUEUR_MAX_DES_PAROLES = 20_000;

function lire(fichier: string): string | null {
  return existsSync(fichier) ? readFileSync(fichier, "utf-8") : null;
}

/** Un mot étiré, dit avec ses mots : le mot lui-même, et sa ligne pour le retrouver. */
export type MotEtireLisible = { mot: string; ligne: string };

export type EtatDesParoles = {
  brouillon: string | null;
  texte: string | null;
  // Résumé des paroles calées : de quel texte, comment, quelle part des mots l'écoute a reconnus,
  // et les mots après lesquels des paroles manquent probablement (alignement seulement).
  calees: { source: string; methode: "whisper" | "alignement"; reconnus: number; lignes: number; etires: MotEtireLisible[] } | null;
  // Le refrain repéré dans les paroles calées (ligne la plus répétée) : de quoi caler le teaser.
  refrain: Passage | null;
};

function motsEtiresLisibles(paroles: ParolesDuKaraoke): MotEtireLisible[] {
  const lisibles: MotEtireLisible[] = [];
  for (const { ligne, mot } of paroles.motsEtires ?? []) {
    const mots = paroles.lignes[ligne]?.mots;
    const texte = mots?.[mot]?.texte;
    // Un numéro hors des paroles (fichier retouché à la main) est ignoré, jamais affiché faux.
    if (mots && texte) lisibles.push({ mot: texte, ligne: mots.map((m) => m.texte).join(" ") });
  }
  return lisibles;
}

export function etatDesParoles(dossierPublic: string, cheminDesCalees: string): EtatDesParoles {
  const brutes = lire(join(dossierPublic, cheminDesCalees));
  let calees: EtatDesParoles["calees"] = null;
  let refrain: Passage | null = null;
  if (brutes) {
    try {
      const paroles = JSON.parse(brutes) as ParolesDuKaraoke;
      calees = {
        source: paroles.source,
        methode: paroles.methode ?? "whisper",
        reconnus: paroles.reconnus,
        lignes: paroles.lignes.length,
        etires: motsEtiresLisibles(paroles),
      };
      refrain = passageDuRefrain(paroles.lignes);
    } catch {
      calees = null;
    }
  }
  return { brouillon: lire(join(dossierPublic, CHEMINS_DES_PAROLES.brouillon)), texte: lire(join(dossierPublic, CHEMINS_DES_PAROLES.texte)), calees, refrain };
}

/** Le texte de l'artiste, écrit de façon atomique. Trop long : refusé (ce ne sont pas des paroles). */
export function enregistrerLesParoles(dossierPublic: string, texte: string): { ok: true } | { ok: false; raison: string } {
  if (texte.length > LONGUEUR_MAX_DES_PAROLES) return { ok: false, raison: `${texte.length} caractères : ${LONGUEUR_MAX_DES_PAROLES} au plus.` };
  const fichier = join(dossierPublic, CHEMINS_DES_PAROLES.texte);
  mkdirSync(dirname(fichier), { recursive: true });
  const temporaire = `${fichier}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaire, texte);
  renameSync(temporaire, fichier);
  return { ok: true };
}
