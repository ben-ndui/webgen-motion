import { CONTRASTE_MINIMUM, type CouleursDeBase, contraste } from "../film-palette";

/**
 * Deviner la marque d'un site à partir de ce que le navigateur a lu : les
 * couleurs CALCULÉES (fonds, boutons, liens, titres) et les polices. Module
 * pur. Ce n'est qu'une proposition : l'assistant la montre « à vérifier ».
 */

export type RoleDeCouleur = "fond-page" | "fond-entete" | "fond-section" | "bouton" | "lien" | "titre" | "texte";
export type CouleurLue = { valeur: string; role: RoleDeCouleur; surface: number };

export type MarqueDevinee = CouleursDeBase & { police: string | null; sources: string[] };

type Rvb = { r: number; v: number; b: number };

/** « rgb(1, 2, 3) », « rgba(…, 0.9) » ou « #aabbcc » ; `null` si transparent ou illisible. */
export function lireCouleur(texte: string): Rvb | null {
  const hexa = /^#([0-9a-f]{6})$/i.exec(texte.trim());
  if (hexa) {
    const n = Number.parseInt(hexa[1]!, 16);
    return { r: (n >> 16) & 255, v: (n >> 8) & 255, b: n & 255 };
  }
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(texte.trim());
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : m[4].endsWith("%") ? Number.parseFloat(m[4]) / 100 : Number(m[4]);
  if (alpha < 0.5) return null;
  return { r: Number(m[1]), v: Number(m[2]), b: Number(m[3]) };
}

export function enHexa({ r, v, b }: Rvb): string {
  return `#${[r, v, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function clarte({ r, v, b }: Rvb): number {
  return (Math.max(r, v, b) + Math.min(r, v, b)) / 2 / 255;
}

function saturation({ r, v, b }: Rvb): number {
  const max = Math.max(r, v, b) / 255;
  const min = Math.min(r, v, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

type Candidate = { rvb: Rvb; hexa: string; role: RoleDeCouleur; surface: number };

function candidates(lues: CouleurLue[], roles: RoleDeCouleur[]): Candidate[] {
  const liste: Candidate[] = [];
  for (const { valeur, role, surface } of lues) {
    if (!roles.includes(role)) continue;
    const rvb = lireCouleur(valeur);
    if (rvb) liste.push({ rvb, hexa: enHexa(rvb), role, surface });
  }
  return liste;
}

/** Premier nom d'une pile CSS (« "Jost", sans-serif » → « Jost ») s'il existe au catalogue du rendu. */
export function policeDuCatalogue(piles: string[], catalogue: ReadonlySet<string>): string | null {
  for (const pile of piles) {
    for (const nom of pile.split(",").map((n) => n.trim().replace(/^["']|["']$/g, ""))) {
      if (catalogue.has(nom)) return nom;
    }
  }
  return null;
}

export function devinerLaMarque(lues: CouleurLue[], polices: string[], catalogue: ReadonlySet<string>): MarqueDevinee {
  const sources: string[] = [];
  const fonds = candidates(lues, ["fond-page", "fond-section", "fond-entete"]).sort((a, b) => b.surface - a.surface);
  const claires = fonds.filter((c) => clarte(c.rvb) > 0.85);
  const clair = claires[0]?.hexa ?? "#FFFFFF";
  if (!claires[0]) sources.push("fond clair : aucun lu, blanc par défaut");

  const sombres = candidates(lues, ["fond-entete", "fond-section", "fond-page", "titre", "texte"])
    .filter((c) => contraste(c.hexa, clair) >= CONTRASTE_MINIMUM)
    .sort((a, b) => clarte(a.rvb) - clarte(b.rvb) || b.surface - a.surface);
  // Un fond sombre réel (en-tête, section) vaut mieux que la couleur du texte.
  const fondSombre = sombres.find((c) => c.role.startsWith("fond") && clarte(c.rvb) < 0.25);
  const encre = (fondSombre ?? sombres[0])?.hexa ?? "#111111";
  if (!fondSombre && !sombres[0]) sources.push("fond sombre : aucun lu, presque noir par défaut");

  const vives = candidates(lues, ["bouton", "lien", "fond-section", "titre"])
    .filter((c) => saturation(c.rvb) >= 0.35 && clarte(c.rvb) > 0.15 && clarte(c.rvb) < 0.85)
    .sort((a, b) => (a.role === "bouton" ? -1 : 0) - (b.role === "bouton" ? -1 : 0) || b.surface - a.surface);
  const accent = vives[0]?.hexa ?? encre;
  if (!vives[0]) sources.push("accent : aucune couleur vive lue, le fond sombre sert d'accent");

  return { encre, clair, accent, police: policeDuCatalogue(polices, catalogue), sources };
}
