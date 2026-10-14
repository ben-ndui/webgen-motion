// Validation de la partie « cinema » de la fiche, à part de validerSpec pour
// la même raison que la bibliothèque : ce fichier importe des fonctions.
import { type Erreurs, estNombre, estObjet, estTexte, texte } from "../validerSpec";
import { DUREE_D_UN_PLAN, QUALITES_DE_CINEMA, ROLES_DE_PLAN } from "./types";

// Au-delà de quatre plans, un Reel de 15 à 20 s n'a plus le temps de les montrer.
export const PLANS_DE_CINEMA = { min: 1, max: 4 } as const;
// Une consigne plus longue noie le personnage et la palette dans le prompt.
export const LONGUEUR_MAX_DE_CONSIGNE = 600;
export const LONGUEUR_MAX_DE_DESCRIPTION = 800;
export const BUDGET_PAR_DEFAUT = 6;
// Garde-fou contre une faute de frappe (60 au lieu de 6) : ~58 $ en Fast.
export const BUDGET_MAX = 24;
const ID_SUR = /^[\w-]+$/;
// Exactement ce que GEN MOTION écrit : ni « .. », ni sous-dossier, ni autre extension.
const FICHIER_SUR = /^cinema\/[\w-]+\.mp4$/;

function verifierDescription(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  if (valeur === undefined) return;
  texte(erreurs, chemin, valeur);
  if (estTexte(valeur) && valeur.length > LONGUEUR_MAX_DE_DESCRIPTION) {
    erreurs.push(`${chemin} : ${LONGUEUR_MAX_DE_DESCRIPTION} caractères au plus, ${valeur.length} reçus`);
  }
}

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

function verifierPlan(erreurs: Erreurs, chemin: string, plan: unknown, objet: unknown): void {
  if (!estObjet(plan)) {
    erreurs.push(`${chemin} : objet attendu`);
    return;
  }
  if (typeof plan.id !== "string" || !ID_SUR.test(plan.id)) {
    erreurs.push(`${chemin}.id : lettres, chiffres, _ et - seulement`);
  }
  if (!ROLES_DE_PLAN.includes(plan.role as "scene")) {
    erreurs.push(`${chemin}.role : l'un de ${ROLES_DE_PLAN.join(", ")}`);
  }
  // Un geste ou un objet sans objet décrit : Veo en inventerait un différent à chaque plan.
  if ((plan.role === "geste" || plan.role === "objet") && !estTexte(objet)) {
    erreurs.push(`${chemin}.role : « ${String(plan.role)} » demande que cinema.objet soit décrit`);
  }
  texte(erreurs, `${chemin}.consigne`, plan.consigne);
  if (estTexte(plan.consigne) && plan.consigne.length > LONGUEUR_MAX_DE_CONSIGNE) {
    erreurs.push(`${chemin}.consigne : ${LONGUEUR_MAX_DE_CONSIGNE} caractères au plus, ${plan.consigne.length} reçus`);
  }
  if (plan.fichier !== undefined && (typeof plan.fichier !== "string" || !FICHIER_SUR.test(plan.fichier))) {
    erreurs.push(`${chemin}.fichier : cinema/<plan>.mp4 (posé par GEN MOTION)`);
  }
  verifierDecoupe(erreurs, `${chemin}.decoupe`, plan.decoupe);
}

/** Les erreurs du cinéma IA ; fiche sans cinéma : rien à dire. */
export function erreursDuCinema(spec: unknown): string[] {
  if (!estObjet(spec)) return ["la fiche du film doit être un objet"];
  const cinema = spec.cinema;
  if (cinema === undefined) return [];
  if (!estObjet(cinema)) return ["cinema : objet attendu"];

  const erreurs: Erreurs = [];
  verifierDescription(erreurs, "cinema.personnage", cinema.personnage);
  verifierDescription(erreurs, "cinema.objet", cinema.objet);
  if (cinema.qualite !== undefined && !QUALITES_DE_CINEMA.includes(cinema.qualite as "fast")) {
    erreurs.push(`cinema.qualite : l'une de ${QUALITES_DE_CINEMA.join(", ")}`);
  }
  if (cinema.budget !== undefined && (!Number.isInteger(cinema.budget) || (cinema.budget as number) < 1 || (cinema.budget as number) > BUDGET_MAX)) {
    erreurs.push(`cinema.budget : nombre entier de plans, de 1 à ${BUDGET_MAX}`);
  }
  if (!Array.isArray(cinema.plans)) {
    erreurs.push("cinema.plans : liste attendue");
    return erreurs;
  }
  const nombre = cinema.plans.length;
  if (nombre < PLANS_DE_CINEMA.min || nombre > PLANS_DE_CINEMA.max) {
    erreurs.push(`cinema.plans : ${PLANS_DE_CINEMA.min} à ${PLANS_DE_CINEMA.max} plans, ${nombre} reçus`);
  }
  const ids = new Set<unknown>();
  cinema.plans.forEach((plan: unknown, index: number) => {
    const chemin = `cinema.plans[${index}]`;
    verifierPlan(erreurs, chemin, plan, cinema.objet);
    const id = estObjet(plan) ? plan.id : undefined;
    if (ids.has(id)) erreurs.push(`${chemin}.id : « ${String(id)} » est déjà pris`);
    ids.add(id);
  });
  return erreurs;
}
