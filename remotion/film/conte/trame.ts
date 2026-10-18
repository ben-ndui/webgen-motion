// LA TRAME d'un conte : ses plans en mesures, ce qui arrive à quel temps, et
// où se posent le héros et les objets. Tout est calculé ici, sans React :
// les composants le lisent, les tests l'éprouvent.
import type { Format } from "../lib/format";
import type { Plan } from "../lib/tempo";
import type { Langue } from "../spec";
import type { ConteSpec } from "./spec";

export const TEMPS_PAR_MESURE = 4;

// Les temps, depuis le début de chaque plan.
export const AVANT = { epoque: 0, titre: 0.5, detail: 2 } as const;
// Le premier objet touche le sol au temps 1, puis un par temps ; il tombe pendant 3/4 de temps.
export const CHUTE = { titre: 0, premierAtterrissage: 1, dureeDeChute: 0.75 } as const;
export const CONSTAT = { glace: 0, titre: 1, chiffre: 1.5, tampon: 3 } as const;
export const SAUF = { titre: 0, fonte: 1, dureeDeFonte: 2 } as const;
export const SOLUTION = { nom: 0, promesse: 1, rangement: 0, dureeDeRangement: 2, totalBarre: 1, apres: 2 } as const;
export const AVANTAGE = { titre: 0, mise: 0.5 } as const;
export const FIN = { adresse: 0.5 } as const;

export const MESURES = { avant: 2, constat: 2, sauf: 1, solution: 2, avantage: 2, fin: 2 } as const;

/** La chute dure le temps de faire tomber tous les objets, plus une mesure pour le voir. */
export function mesuresDeLaChute(objets: number): number {
  return Math.ceil((CHUTE.premierAtterrissage + objets) / TEMPS_PAR_MESURE) + 1;
}

export function idDAvantage(index: number): string {
  return `avantage-${index}`;
}

/** Les plans du conte, dans l'ordre. Le nombre d'avantages vient des textes (identique par langue). */
export function plansDuConte(spec: ConteSpec, langue: Langue): Plan[] {
  const avantages = spec.textes[langue].avantages;
  return [
    { id: "avant", mesures: MESURES.avant },
    { id: "chute", mesures: mesuresDeLaChute(spec.objets.length) },
    { id: "constat", mesures: MESURES.constat },
    { id: "sauf", mesures: MESURES.sauf },
    { id: "solution", mesures: MESURES.solution },
    ...avantages.map((_, index) => ({ id: idDAvantage(index), mesures: MESURES.avantage })),
    { id: "fin", mesures: MESURES.fin },
  ];
}

// --- La scène ---

export type Point = { x: number; y: number };

type Scene = {
  largeur: number;
  // Hauteur du sol (pied du héros et des objets).
  sol: number;
  heros: number;
  objet: number;
  // Objets par côté et par rangée, écart entre deux, distance du premier au centre.
  parRangee: number;
  ecart: number;
  premier: number;
  rayonDOrbite: number;
  // Haut du bloc de titres (sous les réserves des réseaux en 9:16).
  titres: number;
};

export const SCENES: Record<Format, Scene> = {
  paysage: { largeur: 1920, sol: 900, heros: 320, objet: 120, parRangee: 3, ecart: 170, premier: 290, rayonDOrbite: 340, titres: 90 },
  portrait: { largeur: 1080, sol: 1460, heros: 300, objet: 120, parRangee: 2, ecart: 160, premier: 250, rayonDOrbite: 320, titres: 480 },
};

/**
 * Où l'objet n° `index` se pose : à gauche, à droite, à gauche… en s'éloignant
 * du héros ; une rangée pleine, la suivante se pose au-dessus.
 */
export function placeAuSol(index: number, format: Format): Point {
  const s = SCENES[format];
  const cote = index % 2 === 0 ? -1 : 1;
  const rang = Math.floor(index / 2);
  const colonne = rang % s.parRangee;
  const rangee = Math.floor(rang / s.parRangee);
  return {
    x: s.largeur / 2 + cote * (s.premier + colonne * s.ecart),
    y: s.sol - s.objet / 2 - rangee * (s.objet + 30),
  };
}

/** Où l'objet tourne autour du héros, une fois le produit arrivé (`tour` : 0 à 1 = un tour). */
export function placeEnOrbite(index: number, nombre: number, tour: number, format: Format): Point {
  const s = SCENES[format];
  const angle = (index / nombre + tour) * Math.PI * 2 - Math.PI / 2;
  // Ellipse aplatie, centrée sur le haut du héros : l'objet du bas reste dans le cadre.
  const centre = { x: s.largeur / 2, y: s.sol - s.heros * 0.75 };
  return { x: centre.x + Math.cos(angle) * s.rayonDOrbite, y: centre.y + Math.sin(angle) * s.rayonDOrbite * 0.7 };
}

/** La valeur du compteur quand `tombes` objets sur `nombre` ont touché le sol. */
export function valeurPendantLaChute(total: number, tombes: number, nombre: number, decimales: number): number {
  const facteur = 10 ** decimales;
  return Math.round(((total * Math.min(tombes, nombre)) / nombre) * facteur) / facteur;
}

/** Le compteur écrit dans la langue du film : « 4,49 €/mois », « 113 offres ». */
export function ecrireLeCompteur(valeur: number, decimales: number, unite: string, langue: Langue): string {
  const nombre = new Intl.NumberFormat(langue === "fr" ? "fr-FR" : "en-GB", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur);
  return `${nombre} ${unite}`;
}
