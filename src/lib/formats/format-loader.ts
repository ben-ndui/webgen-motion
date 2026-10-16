import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { estNomSur } from "../film-store";
import { CATALOGUE, type FicheDeFormat, type NomDeFormat, erreursDuProjet } from "./catalogue";
import { getFormatsDir } from "./format-store";

/**
 * Lire et écrire les projets de format (`<id>.json` = { format, spec }).
 * SERVEUR SEULEMENT (node:fs). Même règles que les films (film-loader,
 * film-ecriture) : un projet invalide remonte AVEC ses erreurs (jamais
 * avalé), un projet incomplet s'enregistre quand même, l'écriture est
 * atomique et la création n'écrase jamais un projet existant.
 */

export type ProjetDeFormat =
  | { id: string; etat: "valide"; fiche: FicheDeFormat }
  | { id: string; etat: "invalide"; format: NomDeFormat | null; erreurs: string[] };

export type ResultatDEcriture = { ok: true; erreurs: string[] } | { ok: false; statut: 400 | 404 | 409; raison: string };

function chemin(id: string, dossier: string): string {
  return join(dossier, `${id}.json`);
}

function lireProjet(id: string, fichier: string): ProjetDeFormat {
  let entree: unknown;
  try {
    entree = JSON.parse(readFileSync(fichier, "utf-8"));
  } catch (erreur) {
    return { id, etat: "invalide", format: null, erreurs: [`projet illisible : ${(erreur as Error).message}`] };
  }
  const erreurs = erreursDuProjet(entree);
  const format = (entree as { format?: unknown })?.format;
  const nom = typeof format === "string" && format in CATALOGUE ? (format as NomDeFormat) : null;
  if (erreurs.length > 0) return { id, etat: "invalide", format: nom, erreurs };
  return { id, etat: "valide", fiche: entree as FicheDeFormat };
}

/** Tous les projets, triés par id. Dossier absent = aucun projet ; un nom de fichier non sûr est signalé. */
export function listerProjets(dossier: string = getFormatsDir()): ProjetDeFormat[] {
  if (!existsSync(dossier)) return [];
  const projets: ProjetDeFormat[] = [];
  for (const fichier of readdirSync(dossier).sort()) {
    if (!fichier.endsWith(".json") || !statSync(join(dossier, fichier)).isFile()) continue;
    const id = fichier.replace(/\.json$/, "");
    if (!estNomSur(id)) {
      projets.push({ id, etat: "invalide", format: null, erreurs: ["nom de fichier : lettres, chiffres, _ et - seulement"] });
      continue;
    }
    projets.push(lireProjet(id, join(dossier, fichier)));
  }
  return projets;
}

export function chargerProjet(id: string, dossier: string = getFormatsDir()): ProjetDeFormat | null {
  if (!estNomSur(id) || !existsSync(chemin(id, dossier))) return null;
  return lireProjet(id, chemin(id, dossier));
}

/** Le contenu brut (même invalide), pour l'éditeur ; `null` si absent. */
export function lireProjetBrut(id: string, dossier: string = getFormatsDir()): unknown | null {
  if (!estNomSur(id) || !existsSync(chemin(id, dossier))) return null;
  try {
    return JSON.parse(readFileSync(chemin(id, dossier), "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Le point de départ d'un nouveau projet : la fiche d'exemple du format, qui
 * prend le nom du projet. Elle reste marquée `exemple` : le rendu la refuse
 * tant que son contenu (une histoire VRAIE, mais pas la sienne) n'est pas remplacé.
 */
export function projetDeDepart(format: NomDeFormat, id: string): FicheDeFormat {
  const spec = JSON.parse(JSON.stringify(CATALOGUE[format].modele)) as FicheDeFormat["spec"];
  return { format, spec: { ...spec, sujet: id.toLowerCase().replace(/_/g, "-") } } as FicheDeFormat;
}

/** Crée le projet ; refuse d'écraser un projet existant, même en course (`wx`). */
export function creerProjet(id: string, fiche: unknown, dossier: string = getFormatsDir()): ResultatDEcriture {
  if (!estNomSur(id)) return { ok: false, statut: 400, raison: "Nom de projet invalide" };
  mkdirSync(dossier, { recursive: true });
  try {
    writeFileSync(chemin(id, dossier), `${JSON.stringify(fiche, null, 2)}\n`, { flag: "wx" });
  } catch (erreur) {
    if ((erreur as NodeJS.ErrnoException).code === "EEXIST") return { ok: false, statut: 409, raison: "Un projet porte déjà ce nom" };
    throw erreur;
  }
  return { ok: true, erreurs: erreursDuProjet(fiche) };
}

/** Remplace un projet EXISTANT, de façon atomique (temporaire puis renommage). */
export function enregistrerProjet(id: string, fiche: unknown, dossier: string = getFormatsDir()): ResultatDEcriture {
  if (!estNomSur(id)) return { ok: false, statut: 400, raison: "Nom de projet invalide" };
  if (typeof fiche !== "object" || fiche === null || Array.isArray(fiche)) return { ok: false, statut: 400, raison: "Le projet doit être un objet" };
  if (!existsSync(chemin(id, dossier))) return { ok: false, statut: 404, raison: "Projet introuvable" };
  // Le format ne change pas en cours de route : un explainer reste un explainer.
  const actuel = lireProjetBrut(id, dossier) as { format?: unknown } | null;
  if (actuel?.format !== undefined && actuel.format !== (fiche as { format?: unknown }).format) {
    return { ok: false, statut: 400, raison: "Le format d'un projet ne change pas" };
  }
  const temporaire = `${chemin(id, dossier)}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaire, `${JSON.stringify(fiche, null, 2)}\n`);
  renameSync(temporaire, chemin(id, dossier));
  return { ok: true, erreurs: erreursDuProjet(fiche) };
}
