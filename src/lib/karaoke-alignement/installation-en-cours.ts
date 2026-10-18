/**
 * Le verrou de l'installation du modèle (un seul téléchargement à la fois),
 * partagé par la route qui télécharge et celle qui dit l'état : l'écran rouvert
 * en plein téléchargement affiche « en cours » au lieu de proposer un doublon.
 * Rangé sur globalThis : chaque route a son propre paquet de modules, une
 * variable de module ne serait pas la même des deux côtés.
 */
const CLE = Symbol.for("genmotion.installation-alignement");
type AvecVerrou = typeof globalThis & { [CLE]?: boolean };

export function installationEnCours(): boolean {
  return (globalThis as AvecVerrou)[CLE] === true;
}

export function marquerLInstallation(enCours: boolean): void {
  (globalThis as AvecVerrou)[CLE] = enCours;
}
