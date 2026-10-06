import type { CSSProperties } from "react";

// Les styles de texte du film, pour une image de 1920 × 1080. Trois niveaux
// seulement : un titre qui frappe, une phrase qui se lit, un libellé.
// Les tailles sont nommées à part : le masque de `Revele` en a besoin.
//
// Aucun ne fixe la police : elle est posée UNE fois, à la racine du film
// (FilmPrincipal, ApercuStore), et tous les textes en héritent.
export const TAILLES = { titre: 118, phrase: 64, libelle: 30 } as const;

export const TITRE: CSSProperties = {
  fontWeight: 500,
  fontSize: TAILLES.titre,
  lineHeight: 1.04,
  letterSpacing: "-0.02em",
};

export const PHRASE: CSSProperties = {
  fontWeight: 400,
  fontSize: TAILLES.phrase,
  lineHeight: 1.12,
  letterSpacing: "-0.01em",
};

export const LIBELLE: CSSProperties = {
  fontWeight: 500,
  fontSize: TAILLES.libelle,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

// Marge gauche commune à tous les plans : les textes s'alignent d'un plan à
// l'autre, l'œil ne les cherche pas.
export const MARGE = 160;
