import { type FichierJson, lireLeJson, modifierLeJson } from "./json-sous-verrou";

/**
 * Le registre du cinéma d'un film : `~/.webgen-motion/films/<id>/cinema.json`.
 * Il compte les plans payés (le budget) et garde le nom des générations en
 * cours chez Google, pour les reprendre après un rechargement SANS relancer
 * ni repayer. Jamais rendu, jamais lu par Remotion. SERVEUR SEULEMENT.
 *
 * Toute lecture-écriture passe par un verrou de fichier (json-sous-verrou.ts).
 */
export type OperationEnCours = {
  // Nom de l'opération chez Google ; null entre la réservation et la réponse.
  nom: string | null;
  depuis: string;
  // La photo du vrai produit est partie avec ce lancement.
  avecLaPhotoDuProduit?: boolean;
  // Le numéro de prise que la vidéo prendra, fixé au premier téléchargement :
  // un téléchargement retenté réécrit le MÊME fichier au lieu d'en semer un autre.
  prise?: number;
};
export type Registre = { utilises: number; operations: Record<string, OperationEnCours> };

// Une réservation restée sans nom d'opération : le serveur est tombé pendant
// l'appel. Google a pu accepter, donc le plan RESTE compté (on préfère perdre
// un plan de budget que de payer sans le savoir).
export const RESERVATION_ABANDONNEE_MS = 10 * 60_000;

function source(dossier: string): FichierJson<Registre> {
  return {
    dossier,
    fichier: "cinema.json",
    nom: "Le registre du cinéma",
    vide: () => ({ utilises: 0, operations: {} }),
    // Budget inconnu = on ne dépense pas : un registre illisible bloque (lireLeJson).
    normaliser: (brut) => ({ utilises: brut.utilises ?? 0, operations: brut.operations ?? {} }),
  };
}

function modifier<T>(dossier: string, travail: (registre: Registre) => T): T {
  return modifierLeJson(source(dossier), travail);
}

export function lireLeRegistre(dossier: string): Registre {
  return lireLeJson(source(dossier));
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

/** Fixe (une fois) le numéro de prise de l'opération en cours ; rend celui qui tient. */
export function fixerLaPrise(dossier: string, planId: string, proposee: number): number {
  return modifier(dossier, (registre) => {
    const enCours = registre.operations[planId];
    if (!enCours) return proposee;
    enCours.prise ??= proposee;
    return enCours.prise;
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
