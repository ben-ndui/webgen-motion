/**
 * Validation des chemins filesystem fournis par le client, contre la
 * path traversal et les inputs malformés.
 *
 * Contexte : certaines routes du pipeline acceptent un chemin brut
 * (ex. `scaffold-from-project` reçoit `projectPath` + `outDir` du
 * repo cible à filmer). Même si la garde desktop-only restreint déjà
 * l'accès à la machine locale, on durcit l'entrée : chemin absolu
 * obligatoire, pas de null byte, normalisé (les `..` sont résolus),
 * et — quand applicable — contenu sous une racine autorisée.
 *
 * Toutes les fonctions lèvent `SafePathError` (mappée en 400 par les
 * routes) plutôt que de retourner un statut, pour un usage linéaire.
 */

import { existsSync, statSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

export type SafePathCode =
  | "missing"
  | "invalid"
  | "not-absolute"
  | "not-found"
  | "not-directory"
  | "outside-root";

export class SafePathError extends Error {
  code: SafePathCode;
  label: string;
  constructor(code: SafePathCode, label: string, message: string) {
    super(message);
    this.name = "SafePathError";
    this.code = code;
    this.label = label;
  }
}

/**
 * Normalise + valide la FORME d'un chemin absolu local (sans toucher
 * au FS) : string non vide, pas de null byte, absolu. Retourne le
 * chemin résolu (les `.`/`..` sont collapsés par `resolve`).
 */
export function assertAbsoluteLocalPath(
  input: unknown,
  label: string,
): string {
  if (typeof input !== "string" || input.trim() === "") {
    throw new SafePathError("missing", label, `${label} manquant`);
  }
  // Null byte → tentative d'injection / troncature de chemin.
  if (input.includes("\0")) {
    throw new SafePathError("invalid", label, `${label} invalide (null byte)`);
  }
  if (!isAbsolute(input)) {
    throw new SafePathError(
      "not-absolute",
      label,
      `${label} doit être un chemin absolu`,
    );
  }
  // resolve() normalise et collapse les `..`/`.`.
  return resolve(input);
}

/**
 * Valide un chemin absolu ET vérifie qu'il pointe sur un dossier
 * existant. Pour les inputs « source » (ex. `projectPath`).
 */
export function assertExistingDirectory(
  input: unknown,
  label: string,
): string {
  const abs = assertAbsoluteLocalPath(input, label);
  if (!existsSync(abs)) {
    throw new SafePathError("not-found", label, `Chemin introuvable : ${abs}`);
  }
  if (!statSync(abs).isDirectory()) {
    throw new SafePathError(
      "not-directory",
      label,
      `${label} n'est pas un dossier : ${abs}`,
    );
  }
  return abs;
}

/**
 * Vérifie qu'un chemin (déjà résolu) est contenu sous `root` (égal ou
 * descendant). Défense anti-traversal pour les outputs : on évite
 * qu'un `outDir` s'échappe de la racine autorisée.
 */
export function assertContainedPath(
  child: string,
  root: string,
  label: string,
): string {
  const normChild = resolve(child);
  const normRoot = resolve(root);
  const rootWithSep = normRoot.endsWith(sep) ? normRoot : normRoot + sep;
  if (normChild !== normRoot && !normChild.startsWith(rootWithSep)) {
    throw new SafePathError(
      "outside-root",
      label,
      `${label} doit rester sous ${normRoot}`,
    );
  }
  return normChild;
}

/**
 * Valide un dossier de sortie : chemin absolu valide, et — si `root`
 * est fourni — contenu sous cette racine. N'exige pas l'existence (il
 * sera créé par le runner).
 */
export function assertOutputDirectory(
  input: unknown,
  label: string,
  root?: string,
): string {
  const abs = assertAbsoluteLocalPath(input, label);
  if (root) {
    return assertContainedPath(abs, root, label);
  }
  return abs;
}
