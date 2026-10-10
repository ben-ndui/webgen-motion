// Calculs purs des plans de la bibliothèque : ni React ni Remotion, pour être
// testés seuls (geometrie.test.ts). Un plan qui déborde ou se chevauche se
// corrige ici, pas à l'œil dans le studio.

// Séparateur des répétitions de la phrase de l'anneau.
export const SEPARATEUR_ANNEAU = " · ";

/**
 * Les caractères de l'anneau : la phrase répétée autant de fois qu'il faut
 * pour en faire le tour sans trou. `cible` = nombre de caractères qui
 * remplissent le périmètre à la taille choisie. Au moins une fois la phrase.
 */
export function caracteresDeLAnneau(phrase: string, cible: number): string[] {
  const motif = `${phrase.trim()}${SEPARATEUR_ANNEAU}`;
  const repetitions = Math.max(1, Math.round(cible / motif.length));
  return [...motif.repeat(repetitions)];
}

/** Nombre de caractères qui remplissent un cercle de ce rayon à cette taille. */
export function caracteresPourLePerimetre(rayon: number, tailleDuTexte: number, chasse = 0.62): number {
  return Math.round((2 * Math.PI * rayon) / (tailleDuTexte * chasse));
}

/**
 * Rayon qui donne à ces caractères leur chasse exacte sur le tour. La phrase
 * se répète un nombre ENTIER de fois : garder le rayon fixe étirerait ou
 * tasserait les lettres (« D e s i g n e d »), c'est le rayon qui s'adapte.
 */
export function rayonPourLesCaracteres(nombre: number, tailleDuTexte: number, chasse = 0.62): number {
  return Math.round((nombre * tailleDuTexte * chasse) / (2 * Math.PI));
}

/**
 * Vrai si la lettre posée à `angle` (radians, 0 = face au spectateur) regarde
 * le spectateur une fois l'anneau tourné de `rotation`. Une lettre de dos se
 * colore en nuance, jamais par une opacité (mosaïque Remotion).
 */
export function lettreDeFace(angle: number, rotation: number): boolean {
  return Math.cos(angle + rotation) > 0;
}

export type PlaceDansLEventail = {
  // Décalage horizontal depuis le centre de l'éventail, en px.
  x: number;
  // Descente du bord de l'éventail : les écrans des côtés sont plus bas, en px.
  y: number;
  // Inclinaison, en degrés (négatif à gauche).
  angle: number;
  // Ordre d'empilement : l'écran du milieu passe devant.
  plan: number;
};

/**
 * La place de chaque téléphone dans l'éventail, symétrique autour du milieu.
 * `ouverture` va de 0 (tous empilés au centre) à 1 (éventail ouvert).
 */
export function placesDansLEventail(
  nombre: number,
  ouverture: number,
  { ecart, angleMax, creux }: { ecart: number; angleMax: number; creux: number },
): PlaceDansLEventail[] {
  const milieu = (nombre - 1) / 2;
  return Array.from({ length: nombre }, (_, index) => {
    const decalage = index - milieu;
    // Un seul écran : pas de bord, donc pas d'inclinaison.
    const relatif = milieu === 0 ? 0 : decalage / milieu;
    return {
      x: decalage * ecart * ouverture,
      y: Math.abs(relatif) * creux * ouverture,
      angle: relatif * angleMax * ouverture,
      plan: nombre - Math.round(Math.abs(decalage) * 2),
    };
  });
}

/**
 * Combien de caractères de l'adresse sont tapés à l'image `image`. La frappe
 * commence à `debut` et finit à `fin` (images), régulière, sans à-coup.
 */
export function caracteresTapes(image: number, debut: number, fin: number, longueur: number): number {
  if (image < debut || longueur === 0) return 0;
  if (image >= fin) return longueur;
  return Math.min(longueur, Math.floor(((image - debut) / (fin - debut)) * longueur) + 1);
}

/**
 * Corps du mot de la typo cinétique : le plus grand qui tient dans la largeur
 * utile, sans dépasser `tailleMax`. `chasse` = largeur moyenne d'un caractère
 * en fraction du corps (0,62 pour Jost en graisse moyenne, mesuré large).
 */
export function tailleDuMot(longueur: number, largeurUtile: number, tailleMax: number, chasse = 0.62): number {
  if (longueur <= 0) return tailleMax;
  return Math.min(tailleMax, Math.floor(largeurUtile / (longueur * chasse)));
}

/** Le mot et sa pastille : un point final devient la pastille d'accent. */
export function decouperLeMot(mot: string): { lettres: string[]; pastilleAuPoint: boolean } {
  const propre = mot.trim();
  const pastilleAuPoint = propre.endsWith(".");
  return { lettres: [...(pastilleAuPoint ? propre.slice(0, -1) : propre)], pastilleAuPoint };
}

/**
 * Bords gauche et droit de l'éventail OUVERT, en px du cadre. Un écran
 * incliné pivote autour du milieu de sa base : son coin haut s'écarte de
 * hauteur × sin(angle). Sert à prouver qu'aucun écran ne sort du cadre.
 */
export function bordsDeLEventail(
  nombre: number,
  { largeur, hauteur, centreX }: { largeur: number; hauteur: number; centreX: number },
  reglages: { ecart: number; angleMax: number; creux: number },
): { gauche: number; droite: number } {
  const places = placesDansLEventail(nombre, 1, reglages);
  const etendue = (angle: number) => largeur / 2 + hauteur * Math.sin((Math.abs(angle) * Math.PI) / 180);
  return {
    gauche: Math.min(...places.map((p) => centreX + p.x - etendue(p.angle))),
    droite: Math.max(...places.map((p) => centreX + p.x + etendue(p.angle))),
  };
}
