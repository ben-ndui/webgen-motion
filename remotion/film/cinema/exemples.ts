// Les textes de départ d'une série neuve. L'écran les montre en exemple (case
// vide, texte grisé) et le serveur refuse de générer tant qu'ils n'ont pas été
// remplacés : un plan payé sur un texte d'exemple serait de l'argent perdu.
// Ils gardent la fiche valide pendant qu'on la remplit, comme les autres
// textes du film (champ-texte.tsx).
export const EXEMPLES_DE_SERIE = {
  description: "A woman in her thirties, short natural hair, wearing a simple white linen shirt.",
  decor: "A small café at dawn, soft light through the windows.",
  consigne: "She looks out of the window, then smiles at the camera.",
  titre: "Épisode 1",
} as const;

export function estUnExemple(champ: keyof typeof EXEMPLES_DE_SERIE, valeur: string): boolean {
  return valeur.trim() === EXEMPLES_DE_SERIE[champ];
}
