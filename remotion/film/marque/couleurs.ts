import type { MarqueDuFilm } from "../spec";

/** `#RRGGBB` + opacité → `rgba(...)`. Refuse toute autre écriture. */
export function transparence(hexadecimal: string, opacite: number): string {
  const morceaux = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexadecimal);
  if (!morceaux) {
    throw new Error(`Couleur « ${hexadecimal} » : écrire #RRGGBB dans la fiche du film.`);
  }
  const [rouge, vert, bleu] = morceaux.slice(1).map((paire) => Number.parseInt(paire, 16));
  return `rgba(${rouge}, ${vert}, ${bleu}, ${opacite})`;
}

/**
 * La palette du film : celle de la marque, plus des OPACITÉS de l'encre et du
 * clair pour nuancer. Aucune autre teinte : on n'en invente pas.
 */
export function couleursDuFilm(couleurs: MarqueDuFilm["couleurs"]) {
  return {
    ...couleurs,
    encreSecondaire: transparence(couleurs.encre, 0.6),
    encreLibelle: transparence(couleurs.encre, 0.45),
    clairSecondaire: transparence(couleurs.clair, 0.65),
    clairLibelle: transparence(couleurs.clair, 0.45),
  };
}

export type CouleursDuFilm = ReturnType<typeof couleursDuFilm>;
