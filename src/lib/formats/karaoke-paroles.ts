import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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

export type EtatDesParoles = {
  brouillon: string | null;
  texte: string | null;
  // Résumé des paroles calées : de quel texte, et quelle part des mots whisper a reconnus.
  calees: { source: string; reconnus: number; lignes: number } | null;
};

export function etatDesParoles(dossierPublic: string, cheminDesCalees: string): EtatDesParoles {
  const brutes = lire(join(dossierPublic, cheminDesCalees));
  let calees: EtatDesParoles["calees"] = null;
  if (brutes) {
    try {
      const paroles = JSON.parse(brutes) as ParolesDuKaraoke;
      calees = { source: paroles.source, reconnus: paroles.reconnus, lignes: paroles.lignes.length };
    } catch {
      calees = null;
    }
  }
  return { brouillon: lire(join(dossierPublic, CHEMINS_DES_PAROLES.brouillon)), texte: lire(join(dossierPublic, CHEMINS_DES_PAROLES.texte)), calees };
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
