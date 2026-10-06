import { Easing, interpolate } from "remotion";

// Deux courbes seulement, pour que tout le film bouge de la même main :
// - ARRIVEE : rapide au départ, longue décélération (« expo out »). C'est la
//   courbe des entrées : un élément arrive, puis se pose.
// - GLISSE : douce aux deux bouts, pour les déplacements de caméra.
export const ARRIVEE = Easing.bezier(0.16, 1, 0.3, 1);
export const GLISSE = Easing.bezier(0.65, 0, 0.35, 1);

/**
 * Progression de 0 à 1 entre l'image `debut` et `debut + duree`, bornée aux
 * deux bouts. Avant `debut` : 0 ; après : 1.
 */
export function progression(
  image: number,
  debut: number,
  duree: number,
  courbe: (t: number) => number = ARRIVEE,
): number {
  if (duree <= 0) {
    return image >= debut ? 1 : 0;
  }
  return interpolate(image, [debut, debut + duree], [0, 1], {
    easing: courbe,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Valeur qui va de `de` à `a` selon une progression de 0 à 1. */
export function entre(de: number, a: number, t: number): number {
  return de + (a - de) * t;
}
