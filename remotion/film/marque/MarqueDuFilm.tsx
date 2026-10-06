import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { MarqueDuFilm } from "../spec";
import { type CouleursDuFilm, couleursDuFilm } from "./couleurs";

type Marque = Omit<MarqueDuFilm, "couleurs"> & { couleurs: CouleursDuFilm };

// Pas de valeur par défaut : un composant rendu hors d'un film n'a pas de
// marque, et doit le dire plutôt que d'en inventer une.
const Contexte = createContext<Marque | null>(null);

/**
 * Transmet la marque de `props.spec` à tous les plans et composants : les
 * couleurs, le logo, l'ombre et le contact ne s'écrivent nulle part ailleurs.
 */
export function FournisseurDeMarque({ marque, children }: { marque: MarqueDuFilm; children: ReactNode }) {
  const valeur: Marque = { ...marque, couleurs: couleursDuFilm(marque.couleurs) };
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
