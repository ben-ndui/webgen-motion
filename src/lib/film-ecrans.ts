import type { FilmSpec } from "../../remotion/film/spec";

/**
 * Le nom d'un écran change (une capture devient une vidéo, ou l'inverse) :
 * la fiche doit le citer PARTOUT où elle citait l'ancien (parcours, moment
 * clé, preuve, éventail, site), sinon le film chercherait un fichier absent.
 */
export function remplacerUnEcran(fiche: FilmSpec, ancien: string, nouveau: string): void {
  if (ancien === nouveau) return;
  const remplacer = (liste: string[]) => liste.forEach((nom, i) => { if (nom === ancien) liste[i] = nouveau; });
  remplacer(fiche.ecrans.parcours);
  remplacer(fiche.ecrans.evenement);
  if (fiche.ecrans.marque === ancien) fiche.ecrans.marque = nouveau;
  if (fiche.bibliotheque) {
    remplacer(fiche.bibliotheque.eventail);
    if (fiche.bibliotheque.ecranDeLAdresse === ancien) fiche.bibliotheque.ecranDeLAdresse = nouveau;
  }
}

/** « parcours-2.png » + vidéo → « parcours-2.mp4 » ; « parcours-2.mp4 » + image → « parcours-2.png ». */
export function nomPour(nom: string, video: boolean): string {
  const base = nom.replace(/\.[^.]+$/, "");
  if (video) return `${base}.mp4`;
  return /\.(mp4|webm|mov)$/i.test(nom) ? `${base}.png` : nom;
}
