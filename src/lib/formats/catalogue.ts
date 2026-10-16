import { CONTE } from "../../../remotion/film/conte/ficheConte";
import type { ConteSpec } from "../../../remotion/film/conte/spec";
import { erreursDuConte } from "../../../remotion/film/conte/validerConte";
import { EXPLAINER } from "../../../remotion/film/explainer/ficheExplainer";
import type { ExplainerSpec } from "../../../remotion/film/explainer/spec";
import { erreursDeLExplainer } from "../../../remotion/film/explainer/validerExplainer";
import { KARAOKE } from "../../../remotion/film/karaoke/ficheKaraoke";
import type { KaraokeSpec } from "../../../remotion/film/karaoke/spec";
import { erreursDuKaraoke } from "../../../remotion/film/karaoke/validerKaraoke";

/**
 * LE CATALOGUE DES FORMATS : les vidéos qu'on fait à côté du film de marque.
 * Un projet de format = { format, spec } (format-loader.ts), rendu par la
 * composition Remotion du même nom (remotion/film/CompositionsDesFormats.tsx).
 * Ajouter un format = l'écrire dans le gabarit film-motion du brain, le copier
 * dans remotion/film/, puis l'ajouter ICI (un oubli ne compile pas : Record).
 */

export const FORMATS = ["explainer", "conte", "karaoke"] as const;
export type NomDeFormat = (typeof FORMATS)[number];

export type FicheDeFormat =
  | { format: "explainer"; spec: ExplainerSpec }
  | { format: "conte"; spec: ConteSpec }
  | { format: "karaoke"; spec: KaraokeSpec };

export type DefinitionDeFormat = {
  libelle: string;
  // À qui il parle, en une phrase (écran « Choisir un format »).
  pourQui: string;
  description: string;
  composition: "Explainer" | "Conte" | "Karaoke";
  erreurs: (spec: unknown) => string[];
  // La fiche d'exemple du gabarit : le point de départ d'un nouveau projet.
  modele: unknown;
  // Les fichiers que la fiche cite dans le dossier public du projet.
  mediasAttendus: (spec: never) => string[];
};

export const CATALOGUE: Record<NomDeFormat, DefinitionDeFormat> = {
  explainer: {
    libelle: "Explainer",
    pourQui: "Pour expliquer un sujet à des clients, en quelques scènes.",
    description: "Une pastille de chapitre, un pictogramme, un sous-titre encadré : se comprend sans le son.",
    composition: "Explainer",
    erreurs: erreursDeLExplainer,
    modele: EXPLAINER,
    mediasAttendus: (spec: ExplainerSpec) => [spec.musique.fichier],
  },
  conte: {
    libelle: "Conte à compteur",
    pourQui: "Pour vendre un produit avec UN chiffre qui parle.",
    description: "Des objets tombent, un compteur grimpe, puis le produit arrive et le compteur s'écroule.",
    composition: "Conte",
    erreurs: erreursDuConte,
    modele: CONTE,
    mediasAttendus: (spec: ConteSpec) => [
      spec.musique.fichier,
      ...[spec.heros, ...spec.objets].flatMap((figure) => (figure.type === "image" ? [figure.fichier] : [])),
    ],
  },
  karaoke: {
    libelle: "Clip karaoké",
    pourQui: "Pour les artistes : les paroles s'allument au moment où on les chante.",
    description: "Ton morceau, tes paroles calées mot à mot, un décor qui bat sur ton tempo.",
    composition: "Karaoke",
    erreurs: erreursDuKaraoke,
    modele: KARAOKE,
    mediasAttendus: (spec: KaraokeSpec) => [spec.morceau.fichier, spec.paroles],
  },
};

export function estNomDeFormat(valeur: unknown): valeur is NomDeFormat {
  return typeof valeur === "string" && (FORMATS as readonly string[]).includes(valeur);
}

/**
 * Un chemin de média écrit dans la fiche (donc venu du navigateur) reste DANS
 * le dossier public du projet : relatif, sans « .. », sans caractère exotique.
 * Sinon le rendu lirait n'importe quel fichier de l'ordinateur.
 */
export function estCheminDeMediaSur(chemin: unknown): chemin is string {
  return typeof chemin === "string" && /^[\w][\w\-. /]*$/.test(chemin) && !chemin.split("/").includes("..");
}

/** Toutes les erreurs d'un projet { format, spec } ; liste vide = projet valide. */
export function erreursDuProjet(entree: unknown): string[] {
  if (typeof entree !== "object" || entree === null || Array.isArray(entree)) return ["le projet doit être un objet { format, spec }"];
  const { format, spec } = entree as Record<string, unknown>;
  if (!estNomDeFormat(format)) return [`format : l'un de ${FORMATS.join(", ")}`];
  const erreurs = CATALOGUE[format].erreurs(spec);
  if (erreurs.length > 0) return erreurs;
  const medias = (CATALOGUE[format].mediasAttendus as (s: unknown) => string[])(spec);
  return medias.filter((media) => !estCheminDeMediaSur(media)).map((media) => `chemin de média refusé : « ${media} » (relatif au projet, sans « .. »)`);
}
