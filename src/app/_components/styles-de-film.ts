import type { DirectionDuFilm } from "../../../remotion/film/spec";

/** Les trois styles d'un film, tels qu'on les choisit (vignettes dans public/film/styles/). */
export const STYLES: { valeur: DirectionDuFilm; libelle: string; aide: string }[] = [
  { valeur: "marque", libelle: "Marque", aide: "Sobre, tes couleurs" },
  { valeur: "editorial", libelle: "Éditorial", aide: "Clair, lettres fortes" },
  { valeur: "nocturne", libelle: "Nocturne", aide: "Sombre, lettres fines" },
];
