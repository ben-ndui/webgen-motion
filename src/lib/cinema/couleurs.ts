/**
 * Veo ne lit pas « #0A1A2C » : il comprend « midnight navy blue ». On donne
 * donc à chaque couleur de la marque le nom de la teinte de référence la plus
 * proche. Les noms sont en anglais, la langue que Veo suit le mieux.
 */
const TEINTES: ReadonlyArray<[nom: string, hexa: string]> = [
  ["black", "#0B0B0B"],
  ["charcoal grey", "#36454F"],
  ["silver grey", "#B8BCC2"],
  ["white", "#FAFAFA"],
  ["ivory", "#F1EADB"],
  ["beige", "#D8C3A5"],
  ["champagne", "#E8D7A8"],
  ["gold", "#C19A42"],
  ["yellow", "#F2D43C"],
  ["orange", "#F28C28"],
  ["coral", "#F07B5F"],
  ["terracotta", "#C8553D"],
  ["crimson red", "#A01C2C"],
  ["burgundy", "#5E1224"],
  ["blush pink", "#E8B4B8"],
  ["lavender", "#B9A6D9"],
  ["deep purple", "#3A0CA3"],
  ["midnight navy blue", "#0B1B33"],
  ["royal blue", "#2F55D4"],
  ["sky blue", "#87CEEB"],
  ["teal", "#1F7A7A"],
  ["emerald green", "#1E7A4A"],
  ["olive green", "#6B7A3A"],
  ["sage green", "#9CAF88"],
  ["chocolate brown", "#5A3A22"],
];

type Rvb = [number, number, number];

function versRvb(hexa: string): Rvb {
  const valeur = Number.parseInt(hexa.slice(1), 16);
  return [(valeur >> 16) & 255, (valeur >> 8) & 255, valeur & 255];
}

// Distance « redmean » : une approximation simple de l'écart perçu par l'œil,
// meilleure que la distance RVB brute sur les bleus et les rouges.
function ecart(a: Rvb, b: Rvb): number {
  const moyenneRouge = (a[0] + b[0]) / 2;
  const [dr, dv, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return Math.sqrt((2 + moyenneRouge / 256) * dr * dr + 4 * dv * dv + (2 + (255 - moyenneRouge) / 256) * db * db);
}

/** Le nom anglais de la teinte de référence la plus proche de `hexa` (#RRGGBB). */
export function nomDeCouleur(hexa: string): string {
  const cible = versRvb(hexa);
  let meilleur = TEINTES[0];
  for (const teinte of TEINTES) {
    if (ecart(cible, versRvb(teinte[1])) < ecart(cible, versRvb(meilleur[1]))) meilleur = teinte;
  }
  return meilleur[0];
}

/** « midnight navy blue, gold and ivory », sans doublon. */
export function paletteEnMots(hexas: string[]): string {
  const noms = [...new Set(hexas.map(nomDeCouleur))];
  if (noms.length <= 1) return noms.join("");
  return `${noms.slice(0, -1).join(", ")} and ${noms[noms.length - 1]}`;
}
