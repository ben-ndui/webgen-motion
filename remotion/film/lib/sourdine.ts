/**
 * Le volume de la musique sous la voix off : elle baisse pendant chaque
 * ligne, en douceur avant et après (pas de coupe sèche). Module pur.
 */
export type Intervalle = { debut: number; fin: number };

// Images de rampe : assez pour ne pas entendre de « trou », assez court pour
// que la voix ne démarre pas sur la musique pleine.
export const RAMPE = 8;

/** 1 hors des voix, `niveau` pendant, et une rampe linéaire entre les deux. */
export function facteurDeSourdine(image: number, voix: Intervalle[], niveau: number): number {
  let facteur = 1;
  for (const { debut, fin } of voix) {
    let f = 1;
    if (image >= debut && image <= fin) f = niveau;
    else if (image >= debut - RAMPE && image < debut) f = 1 - ((image - (debut - RAMPE)) / RAMPE) * (1 - niveau);
    else if (image > fin && image <= fin + RAMPE) f = niveau + ((image - fin) / RAMPE) * (1 - niveau);
    facteur = Math.min(facteur, f);
  }
  return facteur;
}
