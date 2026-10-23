/**
 * Coupe un texte trop long sans jamais le faire en silence : l'appelante
 * (PDF, Word, texte collé) renvoie toujours `tronque` et `longueurOriginale`
 * à l'écran. Coupe sur la dernière fin de paragraphe avant la limite ; à
 * défaut, sur la dernière fin de ligne ; seulement à défaut des deux, en
 * plein texte. Les deux premiers cas ne s'appliquent que si le repère est
 * assez proche de la limite (pas dans la première moitié du texte).
 */
export type TexteCoupe = { texte: string; tronque: boolean; longueurOriginale: number };

export function couperProprement(texte: string, limite: number): TexteCoupe {
  if (texte.length <= limite) return { texte, tronque: false, longueurOriginale: texte.length };

  const coupe = texte.slice(0, limite);
  const dernierParagraphe = coupe.lastIndexOf("\n\n");
  if (dernierParagraphe > limite * 0.5) {
    return { texte: coupe.slice(0, dernierParagraphe), tronque: true, longueurOriginale: texte.length };
  }
  const derniereLigne = coupe.lastIndexOf("\n");
  if (derniereLigne > limite * 0.5) {
    return { texte: coupe.slice(0, derniereLigne), tronque: true, longueurOriginale: texte.length };
  }
  return { texte: coupe, tronque: true, longueurOriginale: texte.length };
}
