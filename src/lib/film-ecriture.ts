import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { erreursDeLaFiche, getFilmsDir } from "./film-loader";
import { estNomSur } from "./film-store";

/**
 * Écrire une fiche de film (`films/<id>.json`). SERVEUR SEULEMENT.
 *
 * Une fiche INCOMPLÈTE s'enregistre quand même : on remplit un film en
 * plusieurs fois, et perdre ce qu'on vient de taper parce qu'un autre champ
 * manque serait pire. Ses erreurs reviennent avec la réponse, et la page du
 * film les affiche ; le rendu, lui, refuse une fiche invalide.
 */

export type ResultatDEcriture =
  | { ok: true; erreurs: string[] }
  | { ok: false; statut: 400 | 404 | 409; raison: string };

function cheminDeLaFiche(id: string, dossier: string): string {
  return join(dossier, `${id}.json`);
}

function enJson(fiche: unknown): string {
  return `${JSON.stringify(fiche, null, 2)}\n`;
}

/** Crée la fiche ; refuse d'écraser un film qui existe déjà (même en course). */
export function creerFilm(id: string, fiche: unknown, dossier: string = getFilmsDir()): ResultatDEcriture {
  if (!estNomSur(id)) return { ok: false, statut: 400, raison: "Nom de film invalide" };
  mkdirSync(dossier, { recursive: true });
  try {
    // `wx` : échoue si le fichier existe, au moment même de l'écriture. Deux
    // créations simultanées du même nom ne s'écrasent donc pas.
    writeFileSync(cheminDeLaFiche(id, dossier), enJson(fiche), { flag: "wx" });
  } catch (erreur) {
    if ((erreur as NodeJS.ErrnoException).code === "EEXIST") {
      return { ok: false, statut: 409, raison: "Un film porte déjà ce nom" };
    }
    throw erreur;
  }
  return { ok: true, erreurs: erreursDeLaFiche(fiche) };
}

/**
 * Remplace la fiche d'un film EXISTANT. Écriture atomique (fichier temporaire
 * puis renommage) : une coupure au milieu ne laisse jamais une fiche à moitié
 * écrite, que la page lirait comme du JSON invalide.
 */
export function enregistrerFilm(id: string, fiche: unknown, dossier: string = getFilmsDir()): ResultatDEcriture {
  if (!estNomSur(id)) return { ok: false, statut: 400, raison: "Nom de film invalide" };
  if (typeof fiche !== "object" || fiche === null || Array.isArray(fiche)) {
    return { ok: false, statut: 400, raison: "La fiche doit être un objet" };
  }
  const chemin = cheminDeLaFiche(id, dossier);
  if (!existsSync(chemin)) return { ok: false, statut: 404, raison: "Film introuvable" };
  const temporaire = `${chemin}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaire, enJson(fiche));
  renameSync(temporaire, chemin);
  return { ok: true, erreurs: erreursDeLaFiche(fiche) };
}

/** Le contenu brut de la fiche (même invalide), pour l'éditeur ; `null` si absente. */
export function lireFicheBrute(id: string, dossier: string = getFilmsDir()): unknown | null {
  if (!estNomSur(id)) return null;
  const chemin = cheminDeLaFiche(id, dossier);
  if (!existsSync(chemin)) return null;
  try {
    return JSON.parse(readFileSync(chemin, "utf-8"));
  } catch {
    return null;
  }
}
