import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { DirectionDuFilm, MarqueDuFilm } from "../spec";
import { type CouleursDuFilm, couleursDuFilm } from "./couleurs";
import {
  DIRECTION_PAR_DEFAUT,
  type ReglagesDeDirection,
  type SurfaceDuPlan,
  type Tonalite,
  reglagesDeDirection,
  surfaceDuPlan,
} from "./direction";

type Marque = Omit<MarqueDuFilm, "couleurs"> & { couleurs: CouleursDuFilm; direction: ReglagesDeDirection };

// Pas de valeur par défaut : un composant rendu hors d'un film n'a pas de
// marque, et doit le dire plutôt que d'en inventer une.
const Contexte = createContext<Marque | null>(null);

/**
 * Transmet la marque de `props.spec` à tous les plans et composants : les
 * couleurs, le logo, l'ombre et le contact ne s'écrivent nulle part ailleurs.
 */
export function FournisseurDeMarque({
  marque,
  direction = DIRECTION_PAR_DEFAUT,
  children,
}: {
  marque: MarqueDuFilm;
  direction?: DirectionDuFilm;
  children: ReactNode;
}) {
  const couleurs = couleursDuFilm(marque.couleurs);
  const valeur: Marque = { ...marque, couleurs, direction: reglagesDeDirection(direction) };
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useMarque(): Marque {
  const marque = useContext(Contexte);
  if (!marque) {
    throw new Error("useMarque : composant rendu hors de <FournisseurDeMarque> (voir FilmPrincipal).");
  }
  return marque;
}

/** Raccourci : les couleurs de la marque, nuances comprises. */
export function useCouleurs(): CouleursDuFilm {
  return useMarque().couleurs;
}

/** Raccourci : les réglages de la direction artistique du film. */
export function useDirection(): ReglagesDeDirection {
  return useMarque().direction;
}

/**
 * Le fond et les textes d'un plan écrit pour `tonalite`, tels que la
 * direction artistique les pose (elle peut imposer le clair ou le sombre).
 */
export function useSurface(tonalite: Tonalite): SurfaceDuPlan {
  const { couleurs, direction } = useMarque();
  return surfaceDuPlan(tonalite, direction, couleurs);
}
