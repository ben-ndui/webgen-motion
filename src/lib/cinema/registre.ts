import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Le registre du cinéma d'un film : `~/.webgen-motion/films/<id>/cinema.json`.
 * Il compte les plans payés (le budget) et garde le nom des générations en
 * cours chez Google, pour les reprendre après un rechargement SANS relancer
 * ni repayer. Jamais rendu, jamais lu par Remotion. SERVEUR SEULEMENT.
 *
 * Le 14/10, deux générations lancées ensemble ont lu « 3 » chacune et écrit
 * « 4 » : 5 plans comptés pour 6 payés. Toute lecture-écriture passe donc
 * par un verrou de fichier, qui tient aussi entre deux processus.
 */
export type OperationEnCours = {
  // Nom de l'opération chez Google ; null entre la réservation et la réponse.
  nom: string | null;
  depuis: string;
  // La photo du vrai produit est partie avec ce lancement.
  avecLaPhotoDuProduit?: boolean;
};
export type Registre = { utilises: number; operations: Record<string, OperationEnCours> };

const FICHIER = "cinema.json";
const VERROU = "cinema.json.verrou";
// Un verrou plus vieux que ça vient d'un processus mort en plein travail.
const VERROU_ABANDONNE_MS = 10_000;
const ATTENTE_MAX_MS = 5_000;
// Une réservation restée sans nom d'opération : le serveur est tombé pendant
// l'appel. Google a pu accepter, donc le plan RESTE compté (on préfère perdre
// un plan de budget que de payer sans le savoir).
export const RESERVATION_ABANDONNEE_MS = 10 * 60_000;

function attendre(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function prendreLeVerrou(chemin: string): number {
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
      if (Date.now() > limite) throw new Error("Le registre du cinéma est verrouillé depuis plus de 5 s");
      attendre(10);
    }
  }
}

function lire(dossier: string): Registre {
  const chemin = join(dossier, FICHIER);
  if (!existsSync(chemin)) return { utilises: 0, operations: {} };
  let brut: Partial<Registre>;
  try {
    brut = JSON.parse(readFileSync(chemin, "utf-8")) as Partial<Registre>;
  } catch {
    // Budget inconnu = on ne dépense pas : mieux vaut bloquer que payer à l'aveugle.
    throw new Error(`Le registre du cinéma est illisible (${chemin}) : répare-le ou supprime-le avant de générer.`);
  }
  return { utilises: brut.utilises ?? 0, operations: brut.operations ?? {} };
}

function ecrire(dossier: string, registre: Registre): void {
  const temporaire = join(dossier, `${FICHIER}.${process.pid}.tmp`);
  writeFileSync(temporaire, JSON.stringify(registre, null, 2));
  renameSync(temporaire, join(dossier, FICHIER));
}

/** Lit, modifie et réécrit le registre sous verrou. */
function modifier<T>(dossier: string, travail: (registre: Registre) => T): T {
  mkdirSync(dossier, { recursive: true });
  const verrou = join(dossier, VERROU);
  const descripteur = prendreLeVerrou(verrou);
  try {
    const registre = lire(dossier);
    const resultat = travail(registre);
    ecrire(dossier, registre);
    return resultat;
  } finally {
    closeSync(descripteur);
    unlinkSync(verrou);
  }
}

export function lireLeRegistre(dossier: string): Registre {
  return lire(dossier);
}

export type Reservation = { ok: true } | { ok: false; raison: "en-cours" } | { ok: false; raison: "budget"; utilises: number };

/** Réserve un plan du budget AVANT l'appel à Google. */
export function reserver(dossier: string, planId: string, plafond: number, maintenant: number = Date.now()): Reservation {
  return modifier(dossier, (registre) => {
    const enCours = registre.operations[planId];
    const abandonnee = enCours && enCours.nom === null && maintenant - Date.parse(enCours.depuis) > RESERVATION_ABANDONNEE_MS;
    if (abandonnee) delete registre.operations[planId];
    else if (enCours) return { ok: false, raison: "en-cours" } as const;
    if (registre.utilises >= plafond) return { ok: false, raison: "budget", utilises: registre.utilises } as const;
    registre.utilises += 1;
    registre.operations[planId] = { nom: null, depuis: new Date(maintenant).toISOString() };
    return { ok: true } as const;
  });
}

/** Google a accepté le lancement : on garde le nom pour reprendre plus tard. */
export function noterLeLancement(dossier: string, planId: string, nom: string, avecLaPhotoDuProduit = false): void {
  modifier(dossier, (registre) => {
    const enCours = registre.operations[planId];
    if (!enCours) return;
    enCours.nom = nom;
    if (avecLaPhotoDuProduit) enCours.avecLaPhotoDuProduit = true;
  });
}

/** Lancement refusé, ou plan refusé par Google : rien n'a été facturé. */
export function annulerSansFrais(dossier: string, planId: string): void {
  modifier(dossier, (registre) => {
    if (!registre.operations[planId]) return;
    delete registre.operations[planId];
    registre.utilises = Math.max(0, registre.utilises - 1);
  });
}

/** Le plan est livré : il reste compté. */
export function terminer(dossier: string, planId: string): void {
  modifier(dossier, (registre) => {
    delete registre.operations[planId];
  });
}
