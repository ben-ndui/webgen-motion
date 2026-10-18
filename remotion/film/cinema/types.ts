// Le cinéma IA (docs/FILM-CINEMA-IA.md) : des épisodes générés par Veo, avec
// des personnages qui restent les mêmes d'un plan et d'un épisode à l'autre.
// Ce fichier n'importe et n'exporte que des types et des constantes : spec.ts
// le lit tel quel.

// Veo 3.1 Fast (accepte les portraits en référence) ou Lite (un tiers moins
// cher, mais refuse les références) : GEN MOTION choisit selon le plan.
export type QualiteDeCinema = "fast" | "lite";

// Veo (Google, par défaut) ou Seedance (ByteDance, via fal.ai) : qui génère
// la vidéo de ce plan. Absent sur un plan : Veo, choisi automatiquement
// (choisirLeModele). Un choix explicite ne change RIEN d'autre au plan.
export type FournisseurDeCinema = "veo" | "seedance";

// Veo rend toujours 8 secondes : une découpe ne peut pas aller au-delà.
export const DUREE_D_UN_PLAN = 8;
// Veo accepte trois images de référence au plus par plan.
export const PERSONNAGES_PAR_PLAN_MAX = 3;
export const REFERENCES_PAR_PLAN_MAX = 3;

export type Personnage = {
  // Lettres, chiffres, _ et - (« awa ») : sert aussi de clé dans la bible visuelle.
  id: string;
  // Tel qu'on l'appelle dans les consignes et les répliques (« Awa »).
  nom: string;
  // Physique et tenue en une phrase : répétée mot pour mot dans chaque plan.
  description: string;
  // ANCIEN portrait unique (avant la bible visuelle). Plus écrit par GEN
  // MOTION : il devient la version 1 de la vue « en pied » dans la bible.
  portrait?: string;
};

/**
 * Ce que la bible visuelle décrit en plus des personnages : une créature, un
 * objet de l'histoire ou un décor. Ses images (vues, versions, statut) vivent
 * côté serveur dans bible.json, jamais dans la fiche.
 */
export type TypeDElement = "creature" | "objet" | "decor";
export type ElementDeLaBible = { id: string; type: TypeDElement; nom: string; description: string };

// Le rendu des images de référence ET des plans, choisi une fois pour la série.
export const STYLES_VISUELS = ["photorealiste", "cinema-fantasy", "animation-3d", "illustration"] as const;
export type StyleVisuel = (typeof STYLES_VISUELS)[number];

/**
 * Ce qui suit le dernier plan d'un épisode. Absente : le logo de la marque
 * (le comportement d'avant la série autonome).
 */
export type FinDeLEpisode =
  | { type: "logo-de-la-marque" }
  // Un carton : un texte, et le logo du studio (cinema/fin/logo.png|jpg, posé par GEN MOTION).
  | { type: "carton"; texte: string; logo?: string }
  | { type: "aucune" };

/** Le morceau gardé d'un plan de 8 s, en secondes. */
export type DecoupeDuPlan = {
  debut: number;
  fin: number;
  // Un passage retiré au milieu (le fondu que Veo glisse parfois dans un plan).
  coupe?: [number, number];
};

export type RepliqueDuPlan = { personnage: string; texte: string };

export type PlanDeCinema = {
  // Unique dans tout le film : dossier de ses prises (cinema/<id>/prise-<n>.mp4).
  id: string;
  // Ce qui se passe à l'image, en une ou deux phrases.
  consigne: string;
  // Les personnages à l'image (ids), 0 à 3.
  personnages: string[];
  // L'objet du film (cinema.objet) est-il à l'image ?
  objet: boolean;
  // Les références de la bible envoyées en génération (ids, 3 au plus). Absentes :
  // les personnages du plan, dans l'ordre.
  references?: string[];
  // Qui génère ce plan. Absent : Veo (comportement d'avant Seedance).
  fournisseur?: FournisseurDeCinema;
  // Dite par un personnage du plan, en français.
  replique?: RepliqueDuPlan;
  // La PRISE RETENUE, posée par GEN MOTION : c'est elle que le montage joue.
  // Toutes les prises du plan vivent dans prises.json (serveur).
  fichier?: string;
  // Posé par GEN MOTION : la prise retenue a été générée AVEC la photo du vrai
  // produit. Un plan généré avant le dépôt de la photo montre un objet imaginé.
  produitReel?: true;
  // La découpe de la prise retenue.
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

// Un brief pas encore écrit, importé depuis la bible de la cliente (ou noté
// à la main) : repris tel quel dans le brief de « Écrire l'épisode suivant »
// quand on s'y attaque, puis retiré de la liste.
export type EpisodeAVenir = { titre: string; note: string };

export type CinemaDuFilm = {
  personnages: Personnage[];
  // Créatures, objets et décors de la bible visuelle. Absent : aucun.
  elements?: ElementDeLaBible[];
  // Absent : photoréaliste.
  style?: StyleVisuel;
  // Le produit, décrit une fois.
  objet?: string;
  // La photo du VRAI produit (cinema/objet.jpg ou .png), posée par GEN MOTION
  // au dépôt. Envoyée à Veo en référence : le produit n'est plus imaginé.
  photoDeLObjet?: string;
  episodes: EpisodeDeCinema[];
  // Briefs d'épisodes pas encore écrits (import de la bible de la cliente,
  // ou ajoutés à la main). Absente : aucun en attente.
  episodesAVenir?: EpisodeAVenir[];
  // Plans payés au plus pour ce film, refus de Google non comptés. Absent : 20.
  budget?: number;
  // Images de référence générées au plus pour ce film. Absent : 100.
  budgetImages?: number;
  // Absente : le logo de la marque.
  fin?: FinDeLEpisode;
  // « aucune » : l'épisode n'a que le son de ses plans. Absente : la musique du film.
  musique?: "film" | "aucune";
};
