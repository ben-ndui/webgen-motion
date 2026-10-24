/**
 * Passage du texte de bible extrait sur l'écran « Nouvelle série » vers
 * l'étape « Ta série » du film qui vient d'être créé : sessionStorage plutôt
 * qu'un paramètre d'URL (une bible peut faire 50 000 caractères), effacé dès
 * lu pour qu'un rechargement de la page ne le repose pas une seconde fois.
 */
export function cleDuTexteDeDepart(filmId: string): string {
  return `genmotion:bible-depart:${filmId}`;
}
