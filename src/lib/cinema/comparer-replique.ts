/**
 * Comparer la réplique demandée à ce que la transcription a entendu. Module
 * pur. La transcription varie sur la ponctuation, les majuscules, les accents
 * et parfois un petit mot : on compare des MOTS normalisés, et on juge sur la
 * part des mots demandés qu'on a bien entendus.
 */
export const PART_DES_MOTS_EXIGEE = 0.8;

export function motsDe(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Les apostrophes (droite ou typographique) séparent « c'est » en « c » et « est ».
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** La part des mots demandés présents dans ce qui a été entendu (chaque mot entendu ne compte qu'une fois). */
export function partEntendue(attendu: string, entendu: string): number {
  const demandes = motsDe(attendu);
  if (demandes.length === 0) return 1;
  const restants = motsDe(entendu);
  let trouves = 0;
  for (const mot of demandes) {
    const index = restants.indexOf(mot);
    if (index === -1) continue;
    trouves += 1;
    restants.splice(index, 1);
  }
  return trouves / demandes.length;
}

export function repliqueDite(attendu: string, entendu: string): boolean {
  return partEntendue(attendu, entendu) >= PART_DES_MOTS_EXIGEE;
}
