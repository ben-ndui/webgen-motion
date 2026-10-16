// La garde de la fiche d'un explainer : TOUTES les erreurs d'un coup, avec le
// chemin du champ (« textes.en.scenes.piege.mots »). Même méthode que
// validerSpec.ts, dont elle reprend les vérifications de marque et de musique.
//
// Lu tel quel par Node au rendu (avant-rendu.mjs) : il n'importe que des
// types, et validerSpec AVEC son extension (Node ne la devine pas).
import type { ExplainerSpec } from "./spec";
import { erreursDeLaSpec } from "../validerSpec.ts";

type Erreurs = string[];

// Listes écrites ici et non importées de spec.ts : Node lit ce fichier tel
// quel. Le test vérifie qu'elles restent identiques à celles de spec.ts.
export const PICTOS_CONNUS = ["robot", "document", "formulaire", "cadenas", "loupe", "personne", "serveur", "ecran", "horloge", "coche"];
export const TYPES_CONNUS = ["chiffre", "opposition", "tampon", "liste", "phrase"];
const LANGUES = ["fr", "en"];

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function texte(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  if (typeof valeur !== "string" || valeur.trim().length === 0) erreurs.push(`${chemin} : texte non vide attendu`);
}

function picto(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  if (!PICTOS_CONNUS.includes(valeur as string)) erreurs.push(`${chemin} : l'un de ${PICTOS_CONNUS.join(", ")}`);
}

function verifierScenes(erreurs: Erreurs, scenes: unknown): Map<string, string> {
  const types = new Map<string, string>();
  if (!Array.isArray(scenes) || scenes.length < 2) {
    erreurs.push("scenes : au moins deux scènes");
    return types;
  }
  scenes.forEach((scene: unknown, index: number) => {
    const chemin = `scenes[${index}]`;
    const s = estObjet(scene) ? scene : {};
    texte(erreurs, `${chemin}.id`, s.id);
    if (typeof s.id === "string" && types.has(s.id)) erreurs.push(`${chemin}.id : « ${s.id} » déjà pris`);
    if (s.id === "fin") erreurs.push(`${chemin}.id : « fin » est réservé à la fin de la vidéo`);
    if (!Number.isInteger(s.mesures) || (s.mesures as number) < 1) erreurs.push(`${chemin}.mesures : entier ≥ 1`);
    const visuel = estObjet(s.visuel) ? s.visuel : {};
    if (!TYPES_CONNUS.includes(visuel.type as string)) {
      erreurs.push(`${chemin}.visuel.type : l'un de ${TYPES_CONNUS.join(", ")}`);
      return;
    }
    if (visuel.type === "opposition") {
      picto(erreurs, `${chemin}.visuel.gauche`, visuel.gauche);
      picto(erreurs, `${chemin}.visuel.droite`, visuel.droite);
    } else if (visuel.type !== "liste") {
      picto(erreurs, `${chemin}.visuel.picto`, visuel.picto);
    }
    if (typeof s.id === "string") types.set(s.id, visuel.type as string);
  });
  const derniere = scenes.at(-1);
  if (estObjet(derniere) && estObjet(derniere.visuel) && derniere.visuel.type !== "phrase") {
    erreurs.push("scenes : la dernière scène est une `phrase`, la conclusion qu'on retient");
  }
  return types;
}

function verifierMots(erreurs: Erreurs, chemin: string, mots: Record<string, unknown>): void {
  switch (mots.type) {
    case "chiffre":
      texte(erreurs, `${chemin}.valeur`, mots.valeur);
      return;
    case "opposition":
      for (const cote of ["gauche", "droite"]) {
        const carte = estObjet(mots[cote]) ? (mots[cote] as Record<string, unknown>) : {};
        texte(erreurs, `${chemin}.${cote}.titre`, carte.titre);
        texte(erreurs, `${chemin}.${cote}.detail`, carte.detail);
      }
      return;
    case "tampon":
      texte(erreurs, `${chemin}.tampon`, mots.tampon);
      return;
    case "liste": {
      const elements = Array.isArray(mots.elements) ? mots.elements : [];
      if (elements.length < 2 || elements.length > 4) erreurs.push(`${chemin}.elements : 2 à 4 lignes`);
      elements.forEach((element: unknown, i: number) => texte(erreurs, `${chemin}.elements[${i}]`, element));
      return;
    }
    case "phrase":
      texte(erreurs, `${chemin}.phrase`, mots.phrase);
      texte(erreurs, `${chemin}.motFort`, mots.motFort);
      if (typeof mots.phrase === "string" && typeof mots.motFort === "string" && !mots.phrase.includes(mots.motFort)) {
        erreurs.push(`${chemin}.motFort : doit figurer tel quel dans la phrase`);
      }
  }
}

function verifierTextes(erreurs: Erreurs, tous: unknown, types: Map<string, string>): void {
  if (!estObjet(tous)) {
    erreurs.push("textes : objet attendu, une entrée par langue");
    return;
  }
  for (const langue of LANGUES) {
    const t = estObjet(tous[langue]) ? tous[langue] : null;
    if (!t) {
      erreurs.push(`textes.${langue} : manquant`);
      continue;
    }
    texte(erreurs, `textes.${langue}.signature`, t.signature);
    const scenes = estObjet(t.scenes) ? t.scenes : {};
    for (const [id, type] of types) {
      const chemin = `textes.${langue}.scenes.${id}`;
      const s = estObjet(scenes[id]) ? scenes[id] : null;
      if (!s) {
        erreurs.push(`${chemin} : manquant`);
        continue;
      }
      texte(erreurs, `${chemin}.chapitre`, s.chapitre);
      if (type !== "phrase") texte(erreurs, `${chemin}.sousTitre`, s.sousTitre);
      if (s.precision !== undefined) texte(erreurs, `${chemin}.precision`, s.precision);
      const mots = estObjet(s.mots) ? s.mots : {};
      if (mots.type !== type) {
        erreurs.push(`${chemin}.mots.type : « ${type} » attendu, comme le visuel de la scène`);
        continue;
      }
      verifierMots(erreurs, `${chemin}.mots`, mots);
    }
    for (const id of Object.keys(scenes)) {
      if (!types.has(id)) erreurs.push(`textes.${langue}.scenes.${id} : aucune scène ne porte cet identifiant`);
    }
  }
}

/**
 * Marque, musique, déclinaisons et voix : les règles du film, reprises telles
 * quelles. On les éprouve sur une fiche de film minimale qui les porte.
 */
function verifierCommun(erreurs: Erreurs, entree: Record<string, unknown>): void {
  const communes = erreursDeLaSpec({
    exemple: false,
    marque: entree.marque,
    musique: entree.musique,
    declinaisons: entree.declinaisons,
    voix: entree.voix,
  }).filter((erreur) => /^(marque|musique|declinaisons|voix)/.test(erreur));
  erreurs.push(...communes);
}

/** Toutes les erreurs de la fiche ; liste vide = fiche valide. */
export function erreursDeLExplainer(entree: unknown): string[] {
  if (!estObjet(entree)) return ["la fiche de l'explainer doit être un objet"];
  const erreurs: Erreurs = [];
  if (typeof entree.exemple !== "boolean") erreurs.push("exemple : vrai ou faux");
  if (typeof entree.sujet !== "string" || !/^[a-z0-9-]+$/.test(entree.sujet)) {
    erreurs.push("sujet : minuscules, chiffres et tirets (il nomme les fichiers rendus)");
  }
  verifierCommun(erreurs, entree);
  const types = verifierScenes(erreurs, entree.scenes);
  verifierTextes(erreurs, entree.textes, types);
  return erreurs;
}

/** La fiche, typée, si elle est valide ; sinon une erreur qui liste TOUT. */
export function validerExplainer(entree: unknown): ExplainerSpec {
  const erreurs = erreursDeLExplainer(entree);
  if (erreurs.length > 0) {
    throw new Error(`Fiche de l'explainer invalide (${erreurs.length}) :\n  - ${erreurs.join("\n  - ")}`);
  }
  return entree as ExplainerSpec;
}
