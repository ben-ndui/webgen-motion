// La garde de la fiche d'un conte : TOUTES les erreurs d'un coup, avec le
// chemin du champ. Reprend les règles du film pour la marque et la musique.
// Lu tel quel par Node au rendu : types seulement, imports AVEC extension.
import type { ConteSpec } from "./spec";
import { erreursDeLaSpec } from "../validerSpec.ts";

type Erreurs = string[];

// Écrite ici et non importée : Node lit ce fichier tel quel. Le test la compare à pictos.ts.
export const PICTOS_DU_CONTE = ["robot", "document", "formulaire", "cadenas", "loupe", "personne", "serveur", "ecran", "horloge", "coche"];
const LANGUES = ["fr", "en"];
const CHAMPS_DE_TEXTE = [
  "epoque", "avant", "avantDetail", "chute", "libelleCompteur", "unite", "constat",
  "constatChiffre", "tampon", "sauf", "nom", "promesse", "adresse",
];

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function texte(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  if (typeof valeur !== "string" || valeur.trim().length === 0) erreurs.push(`${chemin} : texte non vide attendu`);
}

function figure(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  const f = estObjet(valeur) ? valeur : {};
  if (f.type === "picto") {
    if (!PICTOS_DU_CONTE.includes(f.picto as string)) erreurs.push(`${chemin}.picto : l'un de ${PICTOS_DU_CONTE.join(", ")}`);
    return;
  }
  if (f.type === "image") {
    texte(erreurs, `${chemin}.fichier`, f.fichier);
    if (!(typeof f.rapport === "number" && f.rapport > 0)) erreurs.push(`${chemin}.rapport : nombre positif (largeur / hauteur)`);
    return;
  }
  erreurs.push(`${chemin}.type : « picto » ou « image »`);
}

function verifierCompteur(erreurs: Erreurs, compteur: unknown): void {
  const c = estObjet(compteur) ? compteur : {};
  if (!(typeof c.total === "number" && c.total > 0)) erreurs.push("compteur.total : nombre positif");
  if (!(typeof c.apres === "number" && c.apres >= 0)) erreurs.push("compteur.apres : nombre positif ou nul");
  if (typeof c.total === "number" && typeof c.apres === "number" && c.apres >= c.total) {
    erreurs.push("compteur.apres : plus petit que le total, sinon rien ne s'écroule");
  }
  if (![0, 1, 2].includes(c.decimales as number)) erreurs.push("compteur.decimales : 0, 1 ou 2");
}

function verifierTextes(erreurs: Erreurs, tous: unknown): void {
  if (!estObjet(tous)) {
    erreurs.push("textes : objet attendu, une entrée par langue");
    return;
  }
  const nombres = new Set<number>();
  for (const langue of LANGUES) {
    const t = estObjet(tous[langue]) ? tous[langue] : null;
    if (!t) {
      erreurs.push(`textes.${langue} : manquant`);
      continue;
    }
    for (const champ of CHAMPS_DE_TEXTE) texte(erreurs, `textes.${langue}.${champ}`, t[champ]);
    const avantages = Array.isArray(t.avantages) ? t.avantages : [];
    if (avantages.length < 2 || avantages.length > 4) erreurs.push(`textes.${langue}.avantages : 2 à 4 lignes`);
    avantages.forEach((ligne: unknown, i: number) => texte(erreurs, `textes.${langue}.avantages[${i}]`, ligne));
    nombres.add(avantages.length);
  }
  // Un plan par avantage : deux langues qui n'en ont pas autant feraient deux films différents.
  if (nombres.size > 1) erreurs.push("textes : autant d'avantages dans chaque langue");
}

/** Toutes les erreurs de la fiche ; liste vide = fiche valide. */
export function erreursDuConte(entree: unknown): string[] {
  if (!estObjet(entree)) return ["la fiche du conte doit être un objet"];
  const erreurs: Erreurs = [];
  if (typeof entree.exemple !== "boolean") erreurs.push("exemple : vrai ou faux");
  if (typeof entree.sujet !== "string" || !/^[a-z0-9-]+$/.test(entree.sujet)) {
    erreurs.push("sujet : minuscules, chiffres et tirets (il nomme les fichiers rendus)");
  }
  const communes = erreursDeLaSpec({
    exemple: false,
    marque: entree.marque,
    musique: entree.musique,
    declinaisons: entree.declinaisons,
    voix: entree.voix,
  }).filter((erreur) => /^(marque|musique|declinaisons|voix)/.test(erreur));
  erreurs.push(...communes);
  figure(erreurs, "heros", entree.heros);
  const objets = Array.isArray(entree.objets) ? entree.objets : [];
  if (objets.length < 3 || objets.length > 8) erreurs.push("objets : 3 à 8 objets");
  objets.forEach((objet: unknown, i: number) => figure(erreurs, `objets[${i}]`, objet));
  verifierCompteur(erreurs, entree.compteur);
  verifierTextes(erreurs, entree.textes);
  return erreurs;
}

/** La fiche, typée, si elle est valide ; sinon une erreur qui liste TOUT. */
export function validerConte(entree: unknown): ConteSpec {
  const erreurs = erreursDuConte(entree);
  if (erreurs.length > 0) {
    throw new Error(`Fiche du conte invalide (${erreurs.length}) :\n  - ${erreurs.join("\n  - ")}`);
  }
  return entree as ConteSpec;
}
