// Les mesures d'une scène d'explainer, dans chacun des deux cadres. Un
// composant lit la sienne ici plutôt que de recevoir des tailles en props.
import { type Format, RESERVE_BAS, RESERVE_HAUT } from "../lib/format";

export type MiseEnPage = {
  // Haut de la pastille de chapitre.
  pastilleHaut: number;
  // Zone du visuel : entre ces deux hauteurs, centré.
  visuelHaut: number;
  visuelBas: number;
  // Encadré du sous-titre : sa distance au bas de l'image, et sa largeur.
  encadreBas: number;
  encadreLargeur: number;
  tailleSousTitre: number;
  taillePrecision: number;
  // Taille de référence des pictogrammes et du chiffre géant.
  picto: number;
  chiffre: number;
  // L'opposition : côte à côte en 16:9, l'une sous l'autre en 9:16.
  oppositionEnColonne: boolean;
};

// En 9:16, rien ne se lit dans les réserves des réseaux (240 en haut, 400 en bas).
export const MISES_EN_PAGE: Record<Format, MiseEnPage> = {
  paysage: {
    pastilleHaut: 64,
    visuelHaut: 140,
    visuelBas: 780,
    encadreBas: 70,
    encadreLargeur: 1440,
    tailleSousTitre: 40,
    taillePrecision: 30,
    picto: 220,
    chiffre: 170,
    oppositionEnColonne: false,
  },
  portrait: {
    pastilleHaut: RESERVE_HAUT + 20,
    visuelHaut: RESERVE_HAUT + 120,
    visuelBas: 1920 - RESERVE_BAS - 300,
    encadreBas: RESERVE_BAS + 30,
    encadreLargeur: 940,
    tailleSousTitre: 44,
    taillePrecision: 34,
    picto: 240,
    chiffre: 180,
    oppositionEnColonne: true,
  },
};
