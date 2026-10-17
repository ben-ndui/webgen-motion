// Validation d'UN plan de cinéma : ce qu'il montre, qui parle, son fichier,
// sa découpe. Appelée par validerCinema.ts pour chaque plan du film.
import { type Erreurs, estNombre, estObjet, estTexte, texte } from "../validerSpec";
import { DUREE_D_UN_PLAN, PERSONNAGES_PAR_PLAN_MAX, REFERENCES_PAR_PLAN_MAX } from "./types";

// Une consigne plus longue noie le personnage et la palette dans le prompt.
export const LONGUEUR_MAX_DE_CONSIGNE = 600;
// Au-delà, la réplique ne tient plus dans 8 s dite posément.
export const LONGUEUR_MAX_DE_REPLIQUE = 120;
export const ID_SUR = /^[\w-]+$/;
// Exactement ce que GEN MOTION écrit : une prise (cinema/<plan>/prise-<n>.mp4)
// ou l'ancien fichier unique (cinema/<plan>.mp4). Ni « .. », ni autre extension.
export const FICHIER_DE_PLAN_SUR = /^cinema\/[\w-]+(\/prise-[1-9]\d{0,3})?\.mp4$/;

function verifierDecoupe(erreurs: Erreurs, chemin: string, decoupe: unknown): void {
  if (decoupe === undefined) return;
  if (!estObjet(decoupe)) {
    erreurs.push(`${chemin} : objet attendu`);
    return;
  }
  const { debut, fin, coupe } = decoupe;
  if (!estNombre(debut) || !estNombre(fin) || debut < 0 || fin > DUREE_D_UN_PLAN || fin <= debut) {
    erreurs.push(`${chemin} : début et fin entre 0 et ${DUREE_D_UN_PLAN} s, fin après début`);
    return;
  }
  if (coupe === undefined) return;
  const valide =
    Array.isArray(coupe) && coupe.length === 2 && estNombre(coupe[0]) && estNombre(coupe[1]) &&
    coupe[0] > debut && coupe[1] < fin && coupe[0] < coupe[1];
  if (!valide) erreurs.push(`${chemin}.coupe : [début, fin] strictement à l'intérieur du morceau gardé`);
}

function verifierPersonnagesDuPlan(erreurs: Erreurs, chemin: string, personnages: unknown, connus: Set<string>): void {
  if (!Array.isArray(personnages)) {
    erreurs.push(`${chemin} : liste attendue (vide si personne n'est à l'image)`);
    return;
  }
  if (personnages.length > PERSONNAGES_PAR_PLAN_MAX) {
    erreurs.push(`${chemin} : ${PERSONNAGES_PAR_PLAN_MAX} personnages au plus (limite de Veo), ${personnages.length} reçus`);
  }
  if (new Set(personnages).size !== personnages.length) erreurs.push(`${chemin} : un personnage cité deux fois`);
  for (const id of personnages) {
    if (typeof id !== "string" || !connus.has(id)) erreurs.push(`${chemin} : personnage inconnu « ${String(id)} »`);
  }
}

function verifierReplique(erreurs: Erreurs, chemin: string, replique: unknown, personnagesDuPlan: unknown): void {
  if (replique === undefined) return;
  if (!estObjet(replique)) {
    erreurs.push(`${chemin} : objet attendu`);
    return;
  }
  texte(erreurs, `${chemin}.texte`, replique.texte);
  if (estTexte(replique.texte) && replique.texte.length > LONGUEUR_MAX_DE_REPLIQUE) {
    erreurs.push(`${chemin}.texte : ${LONGUEUR_MAX_DE_REPLIQUE} caractères au plus (8 s), ${replique.texte.length} reçus`);
  }
  // Seul un personnage À L'IMAGE peut parler : Veo ne fait pas de voix off.
  const presents = Array.isArray(personnagesDuPlan) ? personnagesDuPlan : [];
  if (!presents.includes(replique.personnage)) {
    erreurs.push(`${chemin}.personnage : « ${String(replique.personnage)} » doit être à l'image dans ce plan`);
  }
}

function verifierReferences(erreurs: Erreurs, chemin: string, references: unknown, connues: Set<string>): void {
  if (references === undefined) return;
  if (!Array.isArray(references)) {
    erreurs.push(`${chemin} : liste attendue`);
    return;
  }
  if (references.length > REFERENCES_PAR_PLAN_MAX) erreurs.push(`${chemin} : ${REFERENCES_PAR_PLAN_MAX} au plus (limite de Veo), ${references.length} reçues`);
  if (new Set(references).size !== references.length) erreurs.push(`${chemin} : une référence citée deux fois`);
  for (const id of references) {
    if (typeof id !== "string" || !connues.has(id)) erreurs.push(`${chemin} : référence inconnue « ${String(id)} »`);
  }
}

// objetEnPhoto : la photo du produit part aussi en référence, elle compte dans la limite de Veo.
export type ContexteDuPlan = { personnagesConnus: Set<string>; referencesConnues: Set<string>; objetDecrit: boolean; objetEnPhoto: boolean };

export function verifierPlan(erreurs: Erreurs, chemin: string, plan: unknown, contexte: ContexteDuPlan): void {
  if (!estObjet(plan)) {
    erreurs.push(`${chemin} : objet attendu`);
    return;
  }
  if (typeof plan.id !== "string" || !ID_SUR.test(plan.id)) erreurs.push(`${chemin}.id : lettres, chiffres, _ et - seulement`);
  texte(erreurs, `${chemin}.consigne`, plan.consigne);
  if (estTexte(plan.consigne) && plan.consigne.length > LONGUEUR_MAX_DE_CONSIGNE) {
    erreurs.push(`${chemin}.consigne : ${LONGUEUR_MAX_DE_CONSIGNE} caractères au plus, ${plan.consigne.length} reçus`);
  }
  verifierPersonnagesDuPlan(erreurs, `${chemin}.personnages`, plan.personnages, contexte.personnagesConnus);
  if (typeof plan.objet !== "boolean") erreurs.push(`${chemin}.objet : vrai ou faux`);
  // Un objet à l'image sans description : Veo en inventerait un différent à chaque plan.
  if (plan.objet === true && !contexte.objetDecrit) erreurs.push(`${chemin}.objet : décris d'abord l'objet du film (cinema.objet)`);
  verifierReferences(erreurs, `${chemin}.references`, plan.references, contexte.referencesConnues);
  // Sans choix explicite, les personnages du plan partent en référence ; la photo du produit s'y ajoute.
  const choisies = Array.isArray(plan.references) ? plan.references : Array.isArray(plan.personnages) ? plan.personnages : [];
  const references = choisies.length + (plan.objet === true && contexte.objetEnPhoto ? 1 : 0);
  if (choisies.length <= REFERENCES_PAR_PLAN_MAX && references > REFERENCES_PAR_PLAN_MAX) {
    erreurs.push(`${chemin} : ${references} images de référence (références + photo du produit), ${REFERENCES_PAR_PLAN_MAX} au plus pour Veo`);
  }
  verifierReplique(erreurs, `${chemin}.replique`, plan.replique, plan.personnages);
  if (plan.fichier !== undefined && (typeof plan.fichier !== "string" || !FICHIER_DE_PLAN_SUR.test(plan.fichier))) {
    erreurs.push(`${chemin}.fichier : cinema/<plan>/prise-<n>.mp4 (posé par GEN MOTION)`);
  }
  if (plan.produitReel !== undefined && plan.produitReel !== true) erreurs.push(`${chemin}.produitReel : vrai ou absent (posé par GEN MOTION)`);
  verifierDecoupe(erreurs, `${chemin}.decoupe`, plan.decoupe);
}
