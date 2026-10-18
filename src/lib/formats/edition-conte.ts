import type { ConteSpec, FigureDuConte } from "../../../remotion/film/conte/spec";
import type { Langue } from "../../../remotion/film/spec";

/**
 * Modifier un conte sans désaccorder ses deux langues ni sortir des bornes de
 * la validation : 3 à 8 objets, 2 à 4 avantages (un plan chacun, autant en
 * français qu'en anglais). Fonctions pures, sur une copie.
 */

const LANGUES: Langue[] = ["fr", "en"];
export const OBJETS = { min: 3, max: 8 } as const;
export const AVANTAGES = { min: 2, max: 4 } as const;

export function ajouterUnObjet(spec: ConteSpec, figure: FigureDuConte = { type: "picto", picto: "document" }): ConteSpec {
  if (spec.objets.length >= OBJETS.max) return spec;
  return { ...spec, objets: [...spec.objets, figure] };
}

export function retirerUnObjet(spec: ConteSpec, index: number): ConteSpec {
  if (spec.objets.length <= OBJETS.min) return spec;
  return { ...spec, objets: spec.objets.filter((_, i) => i !== index) };
}

/** Un avantage de plus, vide, dans les deux langues : un plan de plus dans la vidéo. */
export function ajouterUnAvantage(spec: ConteSpec): ConteSpec {
  if (spec.textes.fr.avantages.length >= AVANTAGES.max) return spec;
  const copie = structuredClone(spec);
  for (const langue of LANGUES) copie.textes[langue].avantages.push("");
  return copie;
}

export function retirerUnAvantage(spec: ConteSpec, index: number): ConteSpec {
  if (spec.textes.fr.avantages.length <= AVANTAGES.min) return spec;
  const copie = structuredClone(spec);
  for (const langue of LANGUES) copie.textes[langue].avantages.splice(index, 1);
  return copie;
}

/**
 * Le constat cite-t-il le vrai total du compteur ? « 113 offres à lire » pour
 * un total de 113. Sans le nombre, le texte et le compteur pourraient se
 * contredire à l'écran ; on le signale, sans bloquer (« des centaines »).
 */
export function constatSansLeTotal(spec: ConteSpec, langue: Langue): boolean {
  const chiffres = (spec.textes[langue].constatChiffre.match(/\d[\d\s  ]*(?:[.,]\d+)?/g) ?? []).map((n) =>
    Number(n.replace(/[\s  ]/g, "").replace(",", ".")),
  );
  return !chiffres.includes(spec.compteur.total);
}
