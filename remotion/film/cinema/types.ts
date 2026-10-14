// Le cinéma IA (docs/FILM-CINEMA-IA.md) : des épisodes générés par Veo, avec
// des personnages qui restent les mêmes d'un plan et d'un épisode à l'autre.
// Ce fichier n'importe et n'exporte que des types et des constantes : spec.ts
// le lit tel quel.

// Veo 3.1 Fast (accepte les portraits en référence) ou Lite (un tiers moins
// cher, mais refuse les références) : GEN MOTION choisit selon le plan.
export type QualiteDeCinema = "fast" | "lite";

// Veo rend toujours 8 secondes : une découpe ne peut pas aller au-delà.
export const DUREE_D_UN_PLAN = 8;
// Veo accepte trois images de référence au plus par plan.
export const PERSONNAGES_PAR_PLAN_MAX = 3;

export type Personnage = {
  // Nom de fichier du portrait : lettres, chiffres, _ et - (« awa »).
  id: string;
  // Tel qu'on l'appelle dans les consignes et les répliques (« Awa »).
  nom: string;
  // Physique et tenue en une phrase : répétée mot pour mot dans chaque plan.
  description: string;
  // cinema/personnages/<id>.jpg ou .png, posé par GEN MOTION.
  portrait?: string;
};

/** Le morceau gardé d'un plan de 8 s, en secondes. */
export type DecoupeDuPlan = {
  debut: number;
  fin: number;
  // Un passage retiré au milieu (le fondu que Veo glisse parfois dans un plan).
  coupe?: [number, number];
};

export type RepliqueDuPlan = { personnage: string; texte: string };

export type PlanDeCinema = {
  // Unique dans tout le film : nom du fichier rendu (cinema/<id>.mp4).
  id: string;
  // Ce qui se passe à l'image, en une ou deux phrases.
  consigne: string;
  // Les personnages à l'image (ids), 0 à 3.
  personnages: string[];
  // L'objet du film (cinema.objet) est-il à l'image ?
  objet: boolean;
  // Dite par un personnage du plan, en français.
  replique?: RepliqueDuPlan;
  fichier?: string;
  // Posé par GEN MOTION : la vidéo a été générée AVEC la photo du vrai produit.
  // Un plan généré avant le dépôt de la photo montre un objet imaginé.
  produitReel?: true;
  decoupe?: DecoupeDuPlan;
};

export type SceneDeCinema = {
  id: string;
  // Le lieu et la lumière, répétés dans chaque plan de la scène.
  decor: string;
  plans: PlanDeCinema[];
};

export type EpisodeDeCinema = {
  id: string;
  titre: string;
  scenes: SceneDeCinema[];
};

export type CinemaDuFilm = {
  personnages: Personnage[];
  // Le produit, décrit une fois.
  objet?: string;
  // La photo du VRAI produit (cinema/objet.jpg ou .png), posée par GEN MOTION
  // au dépôt. Envoyée à Veo en référence : le produit n'est plus imaginé.
  photoDeLObjet?: string;
  episodes: EpisodeDeCinema[];
  // Plans payés au plus pour ce film, refus de Google non comptés. Absent : 20.
  budget?: number;
};
