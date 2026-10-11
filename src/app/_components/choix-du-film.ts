import type { DirectionDuFilm, Langue, VersionDuFilm } from "../../../remotion/film/spec";

/** Les choix d'un film, tels qu'on les propose à la création et dans l'assistant. */

export const LANGUES_DU_FILM: { valeur: Langue; libelle: string }[] = [
  { valeur: "fr", libelle: "Français" },
  { valeur: "en", libelle: "Anglais" },
];

export const FORMATS_DU_FILM: { valeur: VersionDuFilm; libelle: string; aide: string }[] = [
  { valeur: "court", libelle: "Vertical 9:16", aide: "Instagram, TikTok, Reels" },
  { valeur: "long", libelle: "Horizontal 16:9", aide: "Site, YouTube, présentation" },
];

// Vignettes dans public/film/styles/.
export const STYLES: { valeur: DirectionDuFilm; libelle: string; aide: string }[] = [
  { valeur: "marque", libelle: "Marque", aide: "Sobre, tes couleurs" },
  { valeur: "editorial", libelle: "Éditorial", aide: "Clair, lettres fortes" },
  { valeur: "nocturne", libelle: "Nocturne", aide: "Sombre, lettres fines" },
];
