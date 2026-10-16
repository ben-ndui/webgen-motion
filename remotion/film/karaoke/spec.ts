// LE contrat d'un CLIP KARAOKÉ (lyric video) : le morceau d'un artiste, ses
// paroles qui s'allument mot à mot au moment où il les chante, sur un décor
// qui pulse sur le temps. Pour les artistes du catalogue GEN MOTION.
//
// Référence de structure (pas de visuels) : le clip karaoké « Cocréateur » de
// Jeanviet (octobre 2026). Décidé avec Ben le 16/10/2026.
//
// Les paroles ne s'écrivent PAS ici : `scripts/caler-paroles.mjs` les cale sur
// le morceau (whisper, en local) dans un paroles.json. Le texte affiché est
// celui de l'artiste, jamais celui de whisper.
// Ce fichier n'importe que des types : Node le lit tel quel.
import type { LigneCalee } from "./alignement";
import type { DeclinaisonDuFilm, Langue, MarqueDuFilm } from "../spec";

export type MorceauDuKaraoke = {
  // Le morceau, dans public/ (mp3 ou wav). Jamais dans le brain.
  fichier: string;
  titre: string;
  artiste: string;
  // Le passage retenu, en secondes du morceau (un refrain pour un reel, tout pour YouTube).
  debut: number;
  fin: number;
  // Tempo MESURÉ (npm run musique) et premier temps, en secondes : le décor pulse dessus.
  tempo: number;
  premierTemps: number;
};

export const DECORS = ["horizon"] as const;
export type DecorDuKaraoke = (typeof DECORS)[number];

export type TextesDuKaraoke = {
  // La ligne de fin sous l'artiste (« Disponible sur toutes les plateformes »).
  disponible: string;
};

export type ParolesDuKaraoke = {
  // Le fichier de paroles d'où elles viennent : un « brouillon » est refusé en livraison.
  source: string;
  // Part des mots écrits que whisper a reconnus (0 à 1).
  reconnus: number;
  lignes: LigneCalee[];
};

export type KaraokeSpec = {
  exemple: boolean;
  sujet: string;
  // La marque de l'ARTISTE : sa palette, sa police, son nom.
  marque: MarqueDuFilm;
  morceau: MorceauDuKaraoke;
  // Chemin du paroles.json dans public/.
  paroles: string;
  decor: DecorDuKaraoke;
  textes: Record<Langue, TextesDuKaraoke>;
  declinaisons: DeclinaisonDuFilm[];
};
