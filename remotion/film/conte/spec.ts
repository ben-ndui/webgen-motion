// LE contrat d'un CONTE À COMPTEUR : une histoire en un seul décor. Un héros
// vit tranquille ; des objets lui tombent dessus un par temps, et un compteur
// grimpe dans le coin ; le héros se fige sous un tampon ; « Sauf un » : le
// produit arrive, les objets se rangent autour du héros, le compteur s'écroule.
//
// Référence de structure (pas de visuels) : la publicité Mammouth AI repérée
// par Ben le 16/10/2026. Le chiffre du compteur est VRAI et daté.
//
// Remplir un conte = remplir `ficheConte.ts`, contrôlée par `validerConte`.
// Ce fichier n'importe que des types : Node le lit tel quel.
import type { Picto } from "../pictos";
import type { DeclinaisonDuFilm, Langue, MarqueDuFilm, MusiqueDuFilm, VoixDuFilm } from "../spec";

/** Ce qui se dessine : un pictogramme maison, ou une image du produit (jamais un logo tiers). */
export type FigureDuConte =
  | { type: "picto"; picto: Picto }
  // Fichier dans public/ (PNG ou SVG, fond transparent) ; rapport = largeur / hauteur.
  | { type: "image"; fichier: string; rapport: number };

export type CompteurDuConte = {
  // La valeur quand tout est tombé, puis celle que le produit ramène.
  total: number;
  apres: number;
  // Chiffres après la virgule (0 pour un nombre d'offres, 2 pour des euros).
  decimales: 0 | 1 | 2;
};

export type TextesDuConte = {
  // Petit libellé au-dessus du premier titre (« Avant Kandidate »).
  epoque: string;
  // La vie tranquille, et sa précision.
  avant: string;
  avantDetail: string;
  // Le titre pendant que les objets tombent.
  chute: string;
  // Le compteur : son libellé et son unité (« À lire », « offres »).
  libelleCompteur: string;
  unite: string;
  // Le constat, puis le chiffre qui l'explique (en accent).
  constat: string;
  constatChiffre: string;
  // Le mot du tampon sur le héros figé (« Épuisé »).
  tampon: string;
  // La bascule, courte : « Sauf un. »
  sauf: string;
  // Le produit et sa promesse.
  nom: string;
  promesse: string;
  // Ce que le produit change, une ligne par plan (2 à 4).
  avantages: string[];
  // L'adresse, dans la pastille de fin.
  adresse: string;
};

export type ConteSpec = {
  exemple: boolean;
  // Nomme les fichiers rendus (« kandidate-offres »).
  sujet: string;
  marque: MarqueDuFilm;
  heros: FigureDuConte;
  // 3 à 8 objets, qui tombent dans cet ordre.
  objets: FigureDuConte[];
  compteur: CompteurDuConte;
  textes: Record<Langue, TextesDuConte>;
  musique: MusiqueDuFilm;
  declinaisons: DeclinaisonDuFilm[];
  // Voix off : repères « avant », « chute », « constat », « sauf », « solution », « avantage.<n> ».
  voix?: VoixDuFilm;
};
