import type { Bible } from "./etat";

/**
 * Réserver une image de la bible AVANT l'appel à Google : contre le double
 * clic (deux générations de la même vue en même temps) et contre le budget
 * d'images dépassé. Pur : `generation.ts` l'appelle sous le verrou de
 * bible.json.
 */
// Une réservation oubliée (le serveur est tombé pendant l'appel, synchrone et
// court chez Gemini) : on la laisse retentable plutôt que bloquer pour rien.
export const RESERVATION_ABANDONNEE_MS = 2 * 60_000;

export type ReservationDImage = { ok: true } | { ok: false; raison: "en-cours" } | { ok: false; raison: "budget"; generees: number };

export function cleDeLaVue(referenceId: string, vue: string): string {
  return `${referenceId}/${vue}`;
}

export function reserverUneImage(bible: Bible, cle: string, plafond: number, maintenant: number = Date.now()): ReservationDImage {
  const depuis = bible.enCours[cle];
  const abandonnee = depuis !== undefined && maintenant - Date.parse(depuis) > RESERVATION_ABANDONNEE_MS;
  if (depuis !== undefined && !abandonnee) return { ok: false, raison: "en-cours" };
  if (bible.imagesGenerees >= plafond) return { ok: false, raison: "budget", generees: bible.imagesGenerees };
  bible.enCours[cle] = new Date(maintenant).toISOString();
  return { ok: true };
}

/** Généré avec succès : compté, et la réservation libérée. */
export function confirmerUneImage(bible: Bible, cle: string): void {
  delete bible.enCours[cle];
  bible.imagesGenerees += 1;
}

/** Refusée par Google, ou erreur réseau : rien n'a été facturé. */
export function libererSansFrais(bible: Bible, cle: string): void {
  delete bible.enCours[cle];
}
