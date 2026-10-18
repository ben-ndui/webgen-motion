/**
 * Un nombre écrit en chiffres, tel qu'on le CHANTE en français : « 10 » → « dix »,
 * « 2026 » → « deux mille vingt-six ». Le modèle d'alignement lit des lettres :
 * « 10 » lu chiffre par chiffre (« unzero ») ne se poserait jamais sur « dix ».
 * Couvre 0 à 999 999 ; au-delà, rien (le mot se glisse alors entre ses voisins).
 */

const UNITES = ["zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
  "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function moinsDeCent(n: number): string {
  if (n < 20) return UNITES[n]!;
  const dizaine = Math.floor(n / 10);
  // 70-79 et 90-99 : soixante-dix, quatre-vingt-dix… (la dizaine précédente + 10 à 19).
  const reste = dizaine === 7 || dizaine === 9 ? n - (dizaine - 1) * 10 : n % 10;
  if (reste === 0) return dizaine === 8 ? "quatre-vingts" : DIZAINES[dizaine]!;
  // « et » : vingt et un… soixante et un, soixante et onze ; jamais avec quatre-vingt.
  const avecEt = (reste === 1 && dizaine !== 8 && dizaine !== 9) || (reste === 11 && dizaine === 7);
  const liaison = avecEt ? " et " : "-";
  return `${DIZAINES[dizaine]}${liaison}${UNITES[reste]}`;
}

function moinsDeMille(n: number): string {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  if (centaines === 0) return moinsDeCent(reste);
  const cent = centaines === 1 ? "cent" : `${UNITES[centaines]} cent${reste === 0 ? "s" : ""}`;
  return reste === 0 ? cent : `${cent} ${moinsDeCent(reste)}`;
}

export function nombreEnLettres(chiffres: string): string | null {
  if (!/^\d{1,6}$/.test(chiffres)) return null;
  const n = Number(chiffres);
  if (n < 1000) return moinsDeMille(n);
  const milliers = Math.floor(n / 1000);
  const reste = n % 1000;
  const mille = milliers === 1 ? "mille" : `${moinsDeMille(milliers)} mille`;
  return reste === 0 ? mille : `${mille} ${moinsDeMille(reste)}`;
}
