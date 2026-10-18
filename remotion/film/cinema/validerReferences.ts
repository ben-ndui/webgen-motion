// Validation de ce que la bible visuelle décrit dans la fiche : les
// personnages, les éléments (créatures, objets, décors) et le style de la
// série. Leurs images vivent côté serveur (bible.json) : seuls les textes
// sont ici. Appelée par validerCinema.ts.
import { type Erreurs, estObjet, estTexte, texte } from "../validerSpec";
import { STYLES_VISUELS } from "./types";
import { ID_SUR } from "./validerPlan";

// Une saison : 13 personnages chez la première cliente, la marge pour les suivantes.
export const PERSONNAGES_MAX = 30;
// Créatures, objets et décors réunis (6 créatures, des objets, des décors par saison).
export const ELEMENTS_MAX = 80;
export const LONGUEUR_MAX_DE_DESCRIPTION = 800;
const PORTRAIT_SUR = /^cinema\/personnages\/[\w-]+\.(jpg|png)$/;
const TYPES_D_ELEMENT: readonly unknown[] = ["creature", "objet", "decor"];

export function verifierDescription(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  texte(erreurs, chemin, valeur);
  if (estTexte(valeur) && valeur.length > LONGUEUR_MAX_DE_DESCRIPTION) {
    erreurs.push(`${chemin} : ${LONGUEUR_MAX_DE_DESCRIPTION} caractères au plus, ${valeur.length} reçus`);
  }
}

// Un id sert de clé dans la bible ET dans les références d'un plan : il est
// unique parmi les personnages ET les éléments.
function noterLId(erreurs: Erreurs, chemin: string, id: unknown, pris: Set<string>): void {
  if (typeof id !== "string" || !ID_SUR.test(id)) erreurs.push(`${chemin}.id : lettres, chiffres, _ et - seulement`);
  else if (pris.has(id)) erreurs.push(`${chemin}.id : « ${id} » est déjà pris`);
  else pris.add(id);
}

export type IdsDeLaBible = { personnages: Set<string>; toutes: Set<string> };

/** Vérifie personnages et éléments ; rend les ids connus (pour les plans). */
export function verifierLaBible(erreurs: Erreurs, cinema: Record<string, unknown>): IdsDeLaBible {
  const toutes = new Set<string>();
  const personnages = new Set<string>();
  const liste = cinema.personnages;
  if (!Array.isArray(liste)) {
    erreurs.push("cinema.personnages : liste attendue (vide s'il n'y a personne)");
  } else {
    if (liste.length > PERSONNAGES_MAX) erreurs.push(`cinema.personnages : ${PERSONNAGES_MAX} au plus, ${liste.length} reçus`);
    liste.forEach((personnage: unknown, index: number) => {
      const chemin = `cinema.personnages[${index}]`;
      const p = estObjet(personnage) ? personnage : {};
      noterLId(erreurs, chemin, p.id, toutes);
      if (typeof p.id === "string") personnages.add(p.id);
      texte(erreurs, `${chemin}.nom`, p.nom);
      verifierDescription(erreurs, `${chemin}.description`, p.description);
      if (p.portrait !== undefined && (typeof p.portrait !== "string" || !PORTRAIT_SUR.test(p.portrait))) {
        erreurs.push(`${chemin}.portrait : cinema/personnages/<id>.jpg ou .png (posé par GEN MOTION)`);
      }
    });
  }
  verifierLesElements(erreurs, cinema.elements, toutes);
  if (cinema.style !== undefined && !(STYLES_VISUELS as readonly unknown[]).includes(cinema.style)) {
    erreurs.push(`cinema.style : ${STYLES_VISUELS.join(", ")}`);
  }
  return { personnages, toutes };
}

function verifierLesElements(erreurs: Erreurs, elements: unknown, pris: Set<string>): void {
  if (elements === undefined) return;
  if (!Array.isArray(elements)) {
    erreurs.push("cinema.elements : liste attendue");
    return;
  }
  if (elements.length > ELEMENTS_MAX) erreurs.push(`cinema.elements : ${ELEMENTS_MAX} au plus, ${elements.length} reçus`);
  elements.forEach((element: unknown, index: number) => {
    const chemin = `cinema.elements[${index}]`;
    const e = estObjet(element) ? element : {};
    noterLId(erreurs, chemin, e.id, pris);
    if (!TYPES_D_ELEMENT.includes(e.type)) erreurs.push(`${chemin}.type : creature, objet ou decor`);
    texte(erreurs, `${chemin}.nom`, e.nom);
    verifierDescription(erreurs, `${chemin}.description`, e.description);
  });
}
