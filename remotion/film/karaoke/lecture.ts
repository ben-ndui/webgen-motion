// CE QUI S'AFFICHE à l'instant t (secondes du morceau) : la ligne chantée, la
// suivante, et jusqu'où chaque mot est rempli. Sans React, testé à part.
import type { LigneCalee, MotCale } from "./alignement";
import type { MorceauDuKaraoke } from "./spec";

// La ligne s'affiche un peu AVANT d'être chantée : on lit ce qu'on va entendre.
export const ANTICIPATION = 0.35;
// Au-delà de ce silence après la ligne, elle disparaît (pont instrumental).
export const SILENCE_MAX = 2.5;

export function debutDeLigne(ligne: LigneCalee): number {
  return ligne.mots[0]?.debut ?? 0;
}

export function finDeLigne(ligne: LigneCalee): number {
  return ligne.mots.at(-1)?.fin ?? 0;
}

/** L'indice de la ligne à afficher, ou -1 (avant le chant, pendant un pont, après). */
export function ligneEnCours(lignes: LigneCalee[], t: number): number {
  for (let i = lignes.length - 1; i >= 0; i -= 1) {
    const ligne = lignes[i]!;
    if (t < debutDeLigne(ligne) - ANTICIPATION) continue;
    const suivante = lignes[i + 1];
    const tenue = Math.min(finDeLigne(ligne) + SILENCE_MAX, suivante ? debutDeLigne(suivante) - ANTICIPATION : Infinity);
    return t < tenue ? i : -1;
  }
  return -1;
}

/** De 0 (pas encore chanté) à 1 (chanté) : la part du mot déjà remplie. */
export function remplissage(mot: MotCale, t: number): number {
  if (t <= mot.debut) return 0;
  if (t >= mot.fin || mot.fin <= mot.debut) return 1;
  return (t - mot.debut) / (mot.fin - mot.debut);
}

/** Le moment où l'on chante pour la première fois : la carte de titre s'efface avant. */
export function premierChant(lignes: LigneCalee[]): number {
  return lignes.length > 0 ? debutDeLigne(lignes[0]!) : Infinity;
}

// La dernière ligne reste à l'écran, remplie, avant la carte de fin : on finit de la lire.
export const TENUE_FINALE = 1.5;
// Les paroles s'effacent sur cette durée, juste avant la carte de fin.
export const FONDU_DES_PAROLES = 0.5;

/**
 * Seules les lignes qui COMMENCENT dans le passage retenu, horodatées depuis
 * son début. Une ligne qui déborde de quelques centièmes reste la sienne.
 */
export function lignesDuPassage(lignes: LigneCalee[], debut: number, fin: number): LigneCalee[] {
  return lignes
    .filter((ligne) => debutDeLigne(ligne) >= debut && debutDeLigne(ligne) < fin)
    .map((ligne) => ({ mots: ligne.mots.map((m) => ({ ...m, debut: m.debut - debut, fin: m.fin - debut })) }));
}

/**
 * Durée du passage À L'ÉCRAN, en secondes : jusqu'à `fin`, mais jamais avant
 * que la dernière ligne ait été chantée puis lue (TENUE_FINALE).
 */
export function dureeDuPassage(lignes: LigneCalee[], debut: number, fin: number): number {
  const passage = lignesDuPassage(lignes, debut, fin);
  const finDuChant = passage.length > 0 ? finDeLigne(passage.at(-1)!) : 0;
  return Math.max(fin - debut, finDuChant + TENUE_FINALE);
}

export type Passage = { debut: number; fin: number };

/** Le passage d'une déclinaison : le teaser en vertical (s'il est défini), le clip sinon. */
export function passageDe(morceau: MorceauDuKaraoke, version: "long" | "court"): Passage {
  return version === "court" && morceau.teaser ? morceau.teaser : { debut: morceau.debut, fin: morceau.fin };
}
