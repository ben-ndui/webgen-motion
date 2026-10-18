import { homedir } from "node:os";
import { join } from "node:path";

import { modelePresent } from "../modeles-whisper";
import { MODELE_FRANCAIS } from "./modele-francais";

/**
 * Où vit le modèle d'alignement sur l'ordinateur, et s'il peut y tourner.
 * Module LÉGER (aucun import d'onnxruntime) : les routes de l'app l'importent
 * sans embarquer le module natif.
 */

/** Calculé à chaque appel (HOME du moment), comme le dossier des modèles whisper. */
export function dossierDesModelesDAlignement(): string {
  return join(homedir(), ".webgen-motion", "modeles");
}

/**
 * onnxruntime ne livre aucun binaire pour macOS Intel : là, l'alignement ne
 * peut pas tourner, on ne propose donc pas ses 356 Mo (relecture du 18/10/2026).
 */
export function alignementPossibleIci(plateforme: string = process.platform, processeur: string = process.arch): boolean {
  return !(plateforme === "darwin" && processeur === "x64");
}

/** Seul le français a son modèle ; null s'il n'est pas là ENTIER, ou s'il ne peut pas tourner ici. */
export function cheminDuModeleDAlignement(langue: string, dossier: string = dossierDesModelesDAlignement()): string | null {
  if (langue !== MODELE_FRANCAIS.langue || !alignementPossibleIci()) return null;
  return modelePresent(MODELE_FRANCAIS, dossier) ? join(dossier, MODELE_FRANCAIS.fichier) : null;
}
