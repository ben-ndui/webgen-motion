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
  // Le passage du clip, en secondes du morceau (tout le morceau pour YouTube).
  debut: number;
  fin: number;
  // Le passage du TEASER (9:16, réseaux), s'il diffère : le refrain, en général. Absent : le
  // vertical reprend le passage du clip. Le clip complet (16:9, YouTube) garde debut / fin.
  teaser?: { debut: number; fin: number };
  // Tempo MESURÉ (npm run musique) et premier temps, en secondes : le décor pulse dessus.
  tempo: number;
  premierTemps: number;
};

export const DECORS = ["horizon", "ville", "ocean", "vinyle", "minimal", "sur-mesure"] as const;
export type DecorDuKaraoke = (typeof DECORS)[number];

/**
 * Le décor « sur mesure » : décrit par l'artiste (ou proposé à partir de ses
 * paroles), généré en vidéo de 8 s qui BOUCLE sur tout le morceau. Une vidéo
 * par format rendu : recadrer du 16:9 en 9:16 donnerait une image floue.
 */
export type FondSurMesure = {
  description: string;
  // Chemins dans public/ ; absent tant que la vidéo n'est pas générée.
  videos: Partial<Record<"long" | "court", string>>;
};

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
  // Seulement pour le décor « sur-mesure ».
  fond?: FondSurMesure;
  textes: Record<Langue, TextesDuKaraoke>;
  declinaisons: DeclinaisonDuFilm[];
};
