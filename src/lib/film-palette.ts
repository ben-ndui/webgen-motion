/**
 * La palette complète d'un film à partir des TROIS couleurs qu'une personne
 * sait donner : le fond sombre de sa marque, le fond clair, et sa couleur
 * d'accent. Les nuances qui servent au TEXTE (accent posé sur le clair, sur
 * le sombre) se calculent pour rester lisibles : contraste WCAG AA (4,5:1)
 * vérifié, pas supposé. Module pur, sans I/O.
 */

export type CouleursDeBase = { encre: string; clair: string; accent: string };

export type PaletteDuFilm = CouleursDeBase & {
  accentSurClair: string;
  accentSurSombre: string;
  bulleRecue: string;
};

export const CONTRASTE_MINIMUM = 4.5;

// Gris des bulles reçues d'iMessage : une conversation qui ressemble à une vraie.
const BULLE_RECUE = "#E9E9EB";

const HEXA = /^#([0-9a-f]{6})$/i;

export function estCouleurHexa(valeur: unknown): valeur is string {
  return typeof valeur === "string" && HEXA.test(valeur);
}

function enRvb(hexa: string): [number, number, number] {
  const valeur = Number.parseInt(hexa.slice(1), 16);
  return [(valeur >> 16) & 255, (valeur >> 8) & 255, valeur & 255];
}

function enHexa([r, v, b]: [number, number, number]): string {
  return `#${[r, v, b].map((canal) => Math.round(canal).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function luminance(hexa: string): number {
  const lineaire = enRvb(hexa).map((canal) => {
    const c = canal / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lineaire[0] + 0.7152 * lineaire[1] + 0.0722 * lineaire[2];
}

export function contraste(premiere: string, seconde: string): number {
  const [claire, sombre] = [luminance(premiere), luminance(seconde)].sort((a, b) => b - a);
  return (claire + 0.05) / (sombre + 0.05);
}

function melanger(depart: string, cible: string, part: number): string {
  const a = enRvb(depart);
  const b = enRvb(cible);
  return enHexa([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * part) as [number, number, number]);
}

/**
 * L'accent rapproché pas à pas de `vers` (noir ou blanc) jusqu'à se lire sur
 * `fond`. Il garde sa teinte : on assombrit ou on éclaircit, on n'invente pas.
 */
function accentLisible(accent: string, fond: string, vers: "#000000" | "#FFFFFF"): string {
  for (let pas = 0; pas <= 20; pas += 1) {
    const essai = melanger(accent, vers, pas / 20);
    if (contraste(essai, fond) >= CONTRASTE_MINIMUM) return essai;
  }
  return vers;
}

export function paletteDuFilm(base: CouleursDeBase): PaletteDuFilm {
  return {
    ...base,
    accentSurClair: accentLisible(base.accent, base.clair, "#000000"),
    accentSurSombre: accentLisible(base.accent, base.encre, "#FFFFFF"),
    bulleRecue: BULLE_RECUE,
  };
}

/**
 * Ce qui empêche la palette de fonctionner, en mots simples. Le fond sombre
 * et le fond clair portent chacun le texte de l'autre : il faut qu'ils se lisent.
 */
export function problemesDeLaPalette(base: CouleursDeBase): string[] {
  const problemes: string[] = [];
  for (const [cle, libelle] of [["encre", "Fond sombre"], ["clair", "Fond clair"], ["accent", "Couleur d'accent"]] as const) {
    if (!estCouleurHexa(base[cle])) problemes.push(`${libelle} : choisir une couleur`);
  }
  if (problemes.length > 0) return problemes;
  if (contraste(base.encre, base.clair) < CONTRASTE_MINIMUM) {
    problemes.push("Le fond sombre et le fond clair sont trop proches : le texte ne se lirait pas");
  }
  return problemes;
}
