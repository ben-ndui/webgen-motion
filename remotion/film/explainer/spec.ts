// LE contrat d'un EXPLAINER : une vidéo qui explique un sujet en quelques
// scènes, sur fond sombre. Chaque scène a une pastille de chapitre en haut,
// un visuel en pictogrammes au centre, et un sous-titre encadré en bas : elle
// se suit sans le son (réseaux), la voix off l'accompagne quand il y en a une.
//
// Référence de structure (pas de visuels) : les explainers d'actualité de
// Jeanviet, octobre 2026. Décidé avec Ben le 16/10/2026.
//
// Même logique que `FilmSpec` : tout ce qui change d'une vidéo à l'autre est
// dans UN objet, rempli dans `ficheExplainer.ts` et contrôlé par `validerExplainer`.
// Ce fichier n'importe que des types : Node le lit tel quel (avant-rendu.mjs).
import type { DeclinaisonDuFilm, Langue, MarqueDuFilm, MusiqueDuFilm, VoixDuFilm } from "../spec";

import type { Picto } from "../pictos";

export type { Picto };

export const TYPES_DE_VISUEL = ["chiffre", "opposition", "tampon", "liste", "phrase"] as const;
export type TypeDeVisuel = (typeof TYPES_DE_VISUEL)[number];

/**
 * Ce que la scène MONTRE, sans un mot (les mots sont dans les textes, par langue) :
 * - `chiffre` : un pictogramme, et sous lui un chiffre géant ;
 * - `opposition` : deux cartes côte à côte, la première barrée (ce qu'on croit / ce qui est) ;
 * - `tampon` : un objet, et un tampon qui s'écrase dessus ;
 * - `liste` : des lignes numérotées, une par temps fort (2 à 4) ;
 * - `phrase` : la phrase qui conclut, sans encadré, sous un pictogramme.
 */
export type VisuelDeScene =
  | { type: "chiffre"; picto: Picto }
  | { type: "opposition"; gauche: Picto; droite: Picto }
  | { type: "tampon"; picto: Picto }
  | { type: "liste" }
  | { type: "phrase"; picto: Picto };

export type SceneDeLExplainer = {
  // Identifiant stable : il relie la scène à ses textes et à sa voix off.
  id: string;
  // Durée en mesures de la musique (4 temps).
  mesures: number;
  visuel: VisuelDeScene;
};

export type CarteDOpposition = { titre: string; detail: string };

/** Les mots d'un visuel, du MÊME type que le visuel de la scène. */
export type MotsDuVisuel =
  | { type: "chiffre"; valeur: string }
  | { type: "opposition"; gauche: CarteDOpposition; droite: CarteDOpposition }
  | { type: "tampon"; tampon: string }
  | { type: "liste"; elements: string[] }
  | { type: "phrase"; phrase: string; motFort: string };

export type TextesDeScene = {
  // La pastille du haut, courte : « Le piège », « Constaté le 16/10 ».
  chapitre: string;
  // L'encadré du bas. Absent seulement pour une scène `phrase` (elle EST le texte).
  sousTitre?: string;
  // Deuxième ligne de l'encadré, en accent : la précision qui pique.
  precision?: string;
  mots: MotsDuVisuel;
};

export type TextesDeLExplainer = {
  // Les textes de chaque scène, par identifiant de scène.
  scenes: Record<string, TextesDeScene>;
  // La ligne sous le logo, à la fin.
  signature: string;
};

export type ExplainerSpec = {
  // Tant que c'est vrai, le rendu de livraison refuse : c'est encore l'exemple.
  exemple: boolean;
  // Nom du sujet, pour les fichiers rendus (« offres-fermees »).
  sujet: string;
  marque: MarqueDuFilm;
  scenes: SceneDeLExplainer[];
  textes: Record<Langue, TextesDeLExplainer>;
  musique: MusiqueDuFilm;
  declinaisons: DeclinaisonDuFilm[];
  // Voix off : une réplique par scène, au repère « scenes.<id> ».
  voix?: VoixDuFilm;
};
