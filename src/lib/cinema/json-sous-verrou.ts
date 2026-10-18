import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lire et réécrire un petit fichier JSON du dossier d'un film SOUS VERROU :
 * le registre du budget (cinema.json), la bible visuelle (bible.json), les
 * prises des plans (prises.json). SERVEUR SEULEMENT.
 *
 * Le 14/10, deux générations lancées ensemble ont lu « 3 » chacune et écrit
 * « 4 » : 5 plans comptés pour 6 payés. Toute lecture-écriture passe donc
 * par un verrou de fichier (création exclusive), qui tient aussi entre deux
 * processus. L'écriture est atomique : fichier temporaire, puis renommage.
 */
// Un verrou plus vieux que ça vient d'un processus mort en plein travail.
const VERROU_ABANDONNE_MS = 10_000;
const ATTENTE_MAX_MS = 5_000;

function attendre(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function prendreLeVerrou(chemin: string, nom: string): number {
  const limite = Date.now() + ATTENTE_MAX_MS;
  for (;;) {
    try {
      return openSync(chemin, "wx");
    } catch (erreur) {
      if ((erreur as NodeJS.ErrnoException).code !== "EEXIST") throw erreur;
      try {
        if (Date.now() - statSync(chemin).mtimeMs > VERROU_ABANDONNE_MS) unlinkSync(chemin);
      } catch {
        // Relâché entre-temps par son propriétaire : on retente tout de suite.
      }
      if (Date.now() > limite) throw new Error(`${nom} est verrouillé depuis plus de 5 s`);
      attendre(10);
    }
  }
}

export type FichierJson<T> = {
  dossier: string;
  fichier: string;
  // Comment on l'appelle dans les messages d'erreur (« Le registre du cinéma »).
  nom: string;
  // Le contenu d'un fichier absent, et la remise en forme d'un fichier lu.
  vide: () => T;
  normaliser: (brut: Partial<T>) => T;
};

/** Lit le fichier ; absent = vide. Illisible : une erreur qui dit quoi faire. */
export function lireLeJson<T>(source: FichierJson<T>): T {
  const chemin = join(source.dossier, source.fichier);
  if (!existsSync(chemin)) return source.vide();
  let brut: Partial<T>;
  try {
    brut = JSON.parse(readFileSync(chemin, "utf-8")) as Partial<T>;
  } catch {
    // Contenu inconnu = on n'écrit rien par-dessus : mieux vaut bloquer que perdre l'historique.
    throw new Error(`${source.nom} est illisible (${chemin}) : répare-le ou supprime-le avant de continuer.`);
  }
  return source.normaliser(brut);
}

/** Lit, modifie et réécrit le fichier sous verrou ; rend ce que `travail` rend. */
export function modifierLeJson<T, R>(source: FichierJson<T>, travail: (contenu: T) => R): R {
  mkdirSync(source.dossier, { recursive: true });
  const verrou = join(source.dossier, `${source.fichier}.verrou`);
  const descripteur = prendreLeVerrou(verrou, source.nom);
  try {
    const contenu = lireLeJson(source);
    const resultat = travail(contenu);
    const temporaire = join(source.dossier, `${source.fichier}.${process.pid}.tmp`);
    writeFileSync(temporaire, JSON.stringify(contenu, null, 2));
    renameSync(temporaire, join(source.dossier, source.fichier));
    return resultat;
  } finally {
    closeSync(descripteur);
    unlinkSync(verrou);
  }
}
