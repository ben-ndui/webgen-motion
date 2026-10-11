import type { FilmSpec, Langue } from "../../../../../../remotion/film/spec";

/**
 * Poser une suggestion du site dans la fiche, d'après sa clé
 * (« parcours.2 », « probleme.messages.0 », « bibliotheque.anneau »…).
 * Une clé inconnue ne touche à rien : on ne crée jamais de champ.
 */
export function poserUneSuggestion(fiche: FilmSpec, langue: Langue, champ: string, valeur: string): void {
  const t = fiche.textes[langue];
  const [plan, sous, rang] = champ.split(".");
  const i = Number(sous);
  if (plan === "bascule" && (sous === "constat" || sous === "chiffre" || sous === "signature")) t.bascule[sous] = valeur;
  else if (champ === "evenement.chute") t.evenement.chute = valeur;
  else if (champ === "fin.disponible") t.fin.disponible = valeur;
  else if (plan === "parcours" && i >= 0 && i < t.parcours.length) t.parcours[i] = valeur;
  else if (plan === "marque" && sous === "mots" && Number(rang) < t.marque.mots.length) t.marque.mots[Number(rang)] = valeur;
  else if (plan === "probleme" && sous === "messages" && t.probleme.messages[Number(rang)]) t.probleme.messages[Number(rang)]!.texte = valeur;
  else if (plan === "bibliotheque" && t.bibliotheque) {
    const b = t.bibliotheque;
    if (sous === "mot" || sous === "anneau" || sous === "signature") b[sous] = valeur;
    else if (sous === "legendesEventail" && Number(rang) < b.legendesEventail.length) b.legendesEventail[Number(rang)] = valeur;
  }
}

/** Les suggestions d'une langue qui diffèrent encore du texte actuel. */
export function suggestionsEnAttente(fiche: FilmSpec, langue: Langue, suggestions: Record<string, string>): [string, string][] {
  const prefixe = `${langue}:`;
  return Object.entries(suggestions)
    .filter(([cle]) => cle.startsWith(prefixe))
    .map(([cle, valeur]): [string, string] => [cle.slice(prefixe.length), valeur])
    .filter(([champ, valeur]) => {
      const essai = structuredClone(fiche);
      poserUneSuggestion(essai, langue, champ, valeur);
      return JSON.stringify(essai.textes[langue]) !== JSON.stringify(fiche.textes[langue]);
    });
}
