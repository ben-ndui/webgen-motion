// Le cinéma IA (docs/FILM-CINEMA-IA.md) : des plans générés par Veo dans les
// couleurs de la marque, montés avant son vrai logo. Ce fichier n'importe et
// n'exporte que des types et des constantes : spec.ts le lit tel quel.

// `scene` : le décor et le personnage ; `geste` : le personnage avec l'objet ;
// `objet` : l'objet seul, mis en valeur.
export const ROLES_DE_PLAN = ["scene", "geste", "objet"] as const;
export type RoleDePlan = (typeof ROLES_DE_PLAN)[number];

// Veo 3.1 Fast (le meilleur rendu) ou Lite (un tiers moins cher).
export const QUALITES_DE_CINEMA = ["fast", "lite"] as const;
export type QualiteDeCinema = (typeof QUALITES_DE_CINEMA)[number];

/** Le morceau gardé d'un plan de 8 s, en secondes. */
export type DecoupeDuPlan = {
  debut: number;
  fin: number;
  // Un passage retiré au milieu (le fondu que Veo glisse parfois dans un plan).
  coupe?: [number, number];
};

export type PlanDeCinema = {
  // Nom du fichier rendu : lettres, chiffres, _ et - (« jardin », « geste »).
  id: string;
  role: RoleDePlan;
  // Ce que la personne demande, en une ou deux phrases.
  consigne: string;
  // public/cinema/<id>.mp4, posé par GEN MOTION quand le plan est prêt.
  fichier?: string;
  decoupe?: DecoupeDuPlan;
};

export type CinemaDuFilm = {
  // Décrits UNE fois, réinjectés mot pour mot dans chaque plan : c'est ce qui
  // garde la même femme et le même flacon d'un plan à l'autre.
  personnage?: string;
  objet?: string;
  plans: PlanDeCinema[];
  // Absente : « fast ».
  qualite?: QualiteDeCinema;
  // Plans générés au plus pour ce film, refus de Google non comptés. Absent : 6.
  budget?: number;
};

// Veo rend toujours 8 secondes : une découpe ne peut pas aller au-delà.
export const DUREE_D_UN_PLAN = 8;
