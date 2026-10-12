// LE contrat du film : tout ce qui change d'un client à l'autre tient dans
// un seul objet `FilmSpec`. Les compositions le reçoivent en inputProps
// Remotion (`props.spec`) et ne lisent RIEN d'autre : aucune couleur, aucun
// texte, aucun nom de produit n'est écrit en dur dans un composant.
//
// Remplir le film = remplir `src/film.ts`. Un outil (GenMotion) peut aussi
// fournir le même objet en JSON au moment du rendu. Dans les deux cas, il
// passe par `validerSpec` (validerSpec.ts) avant le premier plan.
//
// Ce fichier n'importe que des types : Node le lit tel quel (avant-rendu.mjs).
import type { Langue, TextesDeLaBibliotheque, TextesDuFilm } from "./textes/types";

export type { Langue, TextesDeLaBibliotheque, TextesDuFilm };

/**
 * Le logo animé, sous l'une de ses trois formes :
 * - `motSymbole` : un mot en bas de casse, souligné d'un filet d'accent qui
 *   se trace dessous (Kotizo) ;
 * - `glyphe` : un pictogramme dessiné trait par trait, puis un logotype en
 *   capitales espacées (VAGUA). Tracés OFFICIELS de l'identité, dans une
 *   boîte de 100 × 100 : on ne les redessine pas ;
 * - `image` : le fichier officiel, découvert par un rideau (logo S&D, qui
 *   n'est ni un mot ni un tracé simple). Jamais recomposé en texte.
 */
export type LogoDuFilm =
  | { type: "motSymbole"; texte: string; graisse: 400 | 500 | 600; approche: number }
  | {
      type: "glyphe";
      traces: string[];
      logotype: string;
      graisseDuLogotype: 300 | 400 | 500;
      // Espacement des capitales du logotype, en em.
      espacementDuLogotype: number;
    }
  | {
      type: "image";
      // Fichier officiel du logo, dans public/ (PNG ou SVG, fond transparent).
      fichier: string;
      // Largeur / hauteur du fichier : le logo se pose sans se déformer.
      rapport: number;
      // Vrai si le fichier est sombre (logo noir) : le film le pose sur
      // l'encre, il faut l'inverser pour qu'il se lise (logo S&D).
      inverser: boolean;
    };

export type MarqueDuFilm = {
  // Le nom de la marque, tel qu'on le dit (voix off de l'ouverture, titre du
  // film) : un logo fourni en image ne le donne pas.
  nom?: string;
  couleurs: {
    // Fond sombre des plans de marque, et texte sur fond clair.
    encre: string;
    // Fond clair des plans d'app, et texte sur l'encre.
    clair: string;
    // Accent de DÉCOR (filet, route du parcours, bulle envoyée), jamais du texte.
    accent: string;
    // Accent pour du TEXTE, sur fond clair puis sur l'encre.
    accentSurClair: string;
    accentSurSombre: string;
    // Gris des bulles reçues de la conversation (celui d'iMessage).
    bulleRecue: string;
  };
  // Nom exact d'une police Google Fonts (catalogue de @remotion/google-fonts).
  police: string;
  logo: LogoDuFilm;
  // Ombre des téléphones posés sur le fond clair (valeur CSS box-shadow).
  ombreTelephone: string;
  // Dernière ligne du film, dans les déclinaisons qui montrent un contact.
  contact: string;
};

/** Les captures RÉELLES de l'app, dans public/<textes[langue].dossierDesEcrans>/. */
export type EcransDuFilm = {
  // Quatre étapes du parcours principal, dans l'ordre.
  parcours: [string, string, string, string];
  // Le MÊME écran dans des états successifs, jusqu'à celui où le problème est
  // réglé. Chaque état doit se voir différent du précédent.
  evenement: string[];
  // L'écran qui prouve la promesse de la marque.
  marque: string;
};

export type MusiqueDuFilm = {
  // Chemin dans public/.
  fichier: string;
  titre: string;
  source: string;
  // MESURÉS par `npm run musique`, jamais lus sur une fiche.
  tempo: number;
  // Position du premier temps dans le fichier, en secondes.
  premierTemps: number;
  // Volume de la musique, de 0 à 1. Absent : 1.
  volume?: number;
};

/**
 * Une réplique de voix off, dite AU MOMENT où son texte apparaît à l'image
 * (son repère, reperes.ts). `fichier` et `duree` sont posés par GEN MOTION
 * quand la voix est générée ; une réplique sans fichier n'est pas jouée.
 */
export type LigneDeVoix = {
  // Repère (reperes.ts) : « bascule.chiffre », « parcours.2 », « marque.mots.1 »…
  repere: string;
  texte: string;
  // Chemin dans public/ (voix/<langue>/…mp3).
  fichier?: string;
  // Durée de la voix, en secondes.
  duree?: number;
};

export const GENRES_DE_VOIX = ["feminin", "masculin"] as const;
export type GenreDeVoix = (typeof GENRES_DE_VOIX)[number];

export type VoixDuFilm = {
  // Voix féminine ou masculine (voix Google). Absent : la voix des réglages.
  genre?: GenreDeVoix;
  // Volume de la musique PENDANT qu'une voix parle, de 0 à 1.
  musiqueSousLaVoix: number;
  lignes: Record<Langue, LigneDeVoix[]>;
};

export type VersionDuFilm = "long" | "court";

/** Un livrable : une composition Remotion, donc un fichier rendu. */
export type DeclinaisonDuFilm = {
  nom: string;
  langue: Langue;
  // « long » : 16:9 (1920 × 1080) ; « court » : 9:16 (1080 × 1920).
  version: VersionDuFilm;
  // Sans contact là où la plateforme l'interdit (Fiverr) ou l'affiche déjà.
  avecContact: boolean;
};

/** Un plan de l'aperçu App Store : un morceau des rushes, calé en mesures. */
export type PlanDeLApercu = {
  id: string;
  mesures: number;
  // Fichier public/apercu/<langue>/<prise>.mp4, sans extension.
  prise: string;
  // Morceau des rushes, en secondes.
  debut: number;
  fin: number;
};

/**
 * La bibliothèque de plans (bibliotheque/) : des plans de motion design
 * fabriqués, hors de la trame du film, qu'un film ou un reel pioche. Leurs
 * textes sont dans `textes.<langue>.bibliotheque`. Absente : aucune
 * composition « Bibliotheque » n'est créée.
 */
export type BibliothequeDuFilm = {
  // Adresse tapée dans la barre, telle qu'on la lit (« smoothandesign.fr »).
  adresse: string;
  // Capture du SITE que la barre ouvre (bureau, 16:9), dans le dossier des
  // écrans de chaque langue.
  ecranDeLAdresse: string;
  // 3 à 5 vraies captures en téléphone, ouvertes en éventail.
  eventail: string[];
};

export type FilmSpec = {
  // Tant que c'est vrai, `npm run rendu` refuse de livrer : le film est
  // encore l'exemple du gabarit.
  exemple: boolean;
  marque: MarqueDuFilm;
  textes: Record<Langue, TextesDuFilm>;
  ecrans: EcransDuFilm;
  musique: MusiqueDuFilm;
  declinaisons: DeclinaisonDuFilm[];
  // Vide pour une langue = pas d'aperçu dans cette langue.
  apercu: Record<Langue, PlanDeLApercu[]>;
  bibliotheque?: BibliothequeDuFilm;
  // Direction artistique (marque/direction.ts) : redistribue les couleurs de
  // la marque sans en inventer. Absente : « marque », le film tel quel.
  direction?: DirectionDuFilm;
  // Voix off, plan par plan. Absente : le film n'a que sa musique.
  voix?: VoixDuFilm;
};

export const DIRECTIONS = ["marque", "editorial", "nocturne"] as const;
export type DirectionDuFilm = (typeof DIRECTIONS)[number];

export const LANGUES: readonly Langue[] = ["fr", "en"];

/** Toutes les captures citées par le film, sans doublon. */
export function tousLesEcrans(ecrans: EcransDuFilm): string[] {
  return [...new Set([...ecrans.parcours, ...ecrans.evenement, ecrans.marque])];
}
