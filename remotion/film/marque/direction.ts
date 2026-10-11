import type { CSSProperties } from "react";

import type { DirectionDuFilm } from "../spec";
import { type CouleursDuFilm, transparence } from "./couleurs";

/**
 * Une direction artistique change l'ALLURE de tous les plans d'un coup, sans
 * toucher à la palette : elle ne fait que redistribuer les couleurs de la
 * marque (encre, clair, accent) et leurs opacités. Aucune teinte inventée.
 *
 * Chaque plan est écrit pour une tonalité (« sombre » ou « clair ») :
 * - `marque` : chaque plan garde la sienne, le film tel qu'il était ;
 * - `editorial` : TOUT passe au clair, graisse forte et serrée, champ de
 *   points discret (référence : films éditoriaux sur papier) ;
 * - `nocturne` : TOUT passe au sombre, texte fin et large, halo de l'accent.
 */
export type Tonalite = "sombre" | "clair";
export type DecorDeDirection = "aucun" | "points" | "halo";

export type ReglagesDeDirection = {
  // null : chaque plan garde la tonalité pour laquelle il est écrit.
  tonaliteImposee: Tonalite | null;
  graisseDuTitre: number;
  interlettrageDuTitre: string;
  // Le mot géant de la typographie cinétique.
  graisseDuMot: number;
  interlettrageDuMot: string;
  graisseDeLAnneau: number;
  // Lettres de l'anneau vues de dos : nuance du texte, jamais une opacité
  // d'élément (mosaïque Remotion).
  opaciteDeDos: number;
  decor: DecorDeDirection;
};

export const DIRECTION_PAR_DEFAUT: DirectionDuFilm = "marque";

const REGLAGES: Record<DirectionDuFilm, ReglagesDeDirection> = {
  marque: {
    tonaliteImposee: null,
    graisseDuTitre: 500,
    interlettrageDuTitre: "-0.02em",
    graisseDuMot: 500,
    interlettrageDuMot: "-0.02em",
    graisseDeLAnneau: 600,
    opaciteDeDos: 0.45,
    decor: "aucun",
  },
  editorial: {
    tonaliteImposee: "clair",
    graisseDuTitre: 800,
    interlettrageDuTitre: "-0.04em",
    graisseDuMot: 800,
    interlettrageDuMot: "-0.055em",
    graisseDeLAnneau: 800,
    opaciteDeDos: 0.45,
    decor: "points",
  },
  nocturne: {
    tonaliteImposee: "sombre",
    graisseDuTitre: 300,
    interlettrageDuTitre: "0.02em",
    graisseDuMot: 200,
    interlettrageDuMot: "0.06em",
    graisseDeLAnneau: 400,
    opaciteDeDos: 0.25,
    decor: "halo",
  },
};

export function reglagesDeDirection(direction: DirectionDuFilm): ReglagesDeDirection {
  return REGLAGES[direction];
}

/** Ce qu'un plan pose à l'écran : son fond, ses textes, son décor. */
export type SurfaceDuPlan = {
  tonalite: Tonalite;
  fond: string;
  texte: string;
  texteSecondaire: string;
  texteLibelle: string;
  texteDeDos: string;
  // Accent lisible en TEXTE sur ce fond (l'aplat, lui, reste `couleurs.accent`).
  accentTexte: string;
  titre: Pick<CSSProperties, "fontWeight" | "letterSpacing">;
  decor: DecorDeDirection;
  couleurDuDecor: string;
};

export function surfaceDuPlan(
  tonaliteDuPlan: Tonalite,
  reglages: ReglagesDeDirection,
  couleurs: CouleursDuFilm,
): SurfaceDuPlan {
  const tonalite = reglages.tonaliteImposee ?? tonaliteDuPlan;
  const surSombre = tonalite === "sombre";
  const texteHexa = surSombre ? couleurs.clair : couleurs.encre;
  return {
    tonalite,
    fond: surSombre ? couleurs.encre : couleurs.clair,
    texte: texteHexa,
    texteSecondaire: surSombre ? couleurs.clairSecondaire : couleurs.encreSecondaire,
    texteLibelle: surSombre ? couleurs.clairLibelle : couleurs.encreLibelle,
    texteDeDos: transparence(texteHexa, reglages.opaciteDeDos),
    accentTexte: surSombre ? couleurs.accentSurSombre : couleurs.accentSurClair,
    titre: { fontWeight: reglages.graisseDuTitre, letterSpacing: reglages.interlettrageDuTitre },
    decor: reglages.decor,
    couleurDuDecor:
      reglages.decor === "halo" ? transparence(couleurs.accent, 0.3)
      : reglages.decor === "points" ? transparence(texteHexa, 0.22)
      : "transparent",
  };
}

/** Le fond du film sous les plans (visible pendant les transitions). */
export function fondDuFilm(direction: DirectionDuFilm, couleurs: Pick<CouleursDuFilm, "encre" | "clair">): string {
  return reglagesDeDirection(direction).tonaliteImposee === "clair" ? couleurs.clair : couleurs.encre;
}
