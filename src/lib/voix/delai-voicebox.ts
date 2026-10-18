/**
 * Combien de temps attendre Voicebox avant d'abandonner une génération.
 *
 * Banc du 18/10/2026 (Mac de Ben) : 12 à 20 s de calcul par seconde de voix avec
 * Qwen. L'ancien délai fixe de 120 s ne couvrait qu'une dizaine de secondes de voix :
 * une narration de tour (une minute) était coupée à coup sûr, et chaque relance
 * empilait un nouveau calcul chez Voicebox (relecture du 18/10). Le délai suit
 * donc la longueur du texte, avec de la marge.
 */

/** Débit d'une voix off française : environ 15 caractères par seconde. */
const CARACTERES_PAR_SECONDE_DE_VOIX = 15;
/** Le pire mesuré (20 s de calcul par seconde de voix), plus la moitié en marge. */
const SECONDES_DE_CALCUL_PAR_SECONDE_DE_VOIX = 30;
const MINIMUM_MS = 120_000;
const MAXIMUM_MS = 45 * 60_000;

export function delaiDAttenteVoicebox(texte: string): number {
  const secondesDeVoix = texte.length / CARACTERES_PAR_SECONDE_DE_VOIX;
  const attente = secondesDeVoix * SECONDES_DE_CALCUL_PAR_SECONDE_DE_VOIX * 1000;
  return Math.round(Math.min(MAXIMUM_MS, Math.max(MINIMUM_MS, attente)));
}

export function messageDelaiDepasse(delaiMs: number): string {
  return `Voicebox n'a pas fini en ${Math.round(delaiMs / 60_000)} min. Le calcul peut continuer dans Voicebox : `
    + "attends qu'il se termine (onglet Historique de Voicebox) avant de relancer, sinon les calculs s'empilent.";
}
