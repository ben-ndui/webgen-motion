/**
 * Un seul navigateur à la fois par film, quel que soit le geste (remplir
 * depuis le site, choisir ou filmer ses écrans) : deux runners réécrivant
 * la même fiche et les mêmes captures s'emmêleraient. SERVEUR SEULEMENT.
 */
const EN_COURS = new Set<string>();

/** Prend le site du film ; faux si un autre geste le tient déjà. */
export function prendreLeSite(id: string): boolean {
  if (EN_COURS.has(id)) return false;
  EN_COURS.add(id);
  return true;
}

export function rendreLeSite(id: string): void {
  EN_COURS.delete(id);
}
