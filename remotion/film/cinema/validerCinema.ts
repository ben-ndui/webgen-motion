// Validation de la partie « cinema » de la fiche, à part de validerSpec pour
// la même raison que la bibliothèque : ce fichier importe des fonctions.
// Le détail d'un plan est dans validerPlan.ts.
import { type Erreurs, estObjet, estTexte, texte } from "../validerSpec";
import { ID_SUR, verifierPlan } from "./validerPlan";

export const PERSONNAGES_MAX = 4;
export const EPISODES_MAX = 12;
export const SCENES_PAR_EPISODE = { min: 1, max: 4 } as const;
export const PLANS_PAR_SCENE = { min: 1, max: 6 } as const;
export const LONGUEUR_MAX_DE_DESCRIPTION = 800;
export const BUDGET_PAR_DEFAUT = 20;
// Garde-fou contre une faute de frappe (600 au lieu de 60) : ~58 $ en Fast.
export const BUDGET_MAX = 60;
const PORTRAIT_SUR = /^cinema\/personnages\/[\w-]+\.(jpg|png)$/;

function verifierDescription(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  texte(erreurs, chemin, valeur);
  if (estTexte(valeur) && valeur.length > LONGUEUR_MAX_DE_DESCRIPTION) {
    erreurs.push(`${chemin} : ${LONGUEUR_MAX_DE_DESCRIPTION} caractères au plus, ${valeur.length} reçus`);
  }
}

function verifierPersonnages(erreurs: Erreurs, personnages: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(personnages)) {
    erreurs.push("cinema.personnages : liste attendue (vide s'il n'y a personne)");
    return ids;
  }
  if (personnages.length > PERSONNAGES_MAX) erreurs.push(`cinema.personnages : ${PERSONNAGES_MAX} au plus, ${personnages.length} reçus`);
  personnages.forEach((personnage: unknown, index: number) => {
    const chemin = `cinema.personnages[${index}]`;
    const p = estObjet(personnage) ? personnage : {};
    if (typeof p.id !== "string" || !ID_SUR.test(p.id)) erreurs.push(`${chemin}.id : lettres, chiffres, _ et - seulement`);
    else if (ids.has(p.id)) erreurs.push(`${chemin}.id : « ${p.id} » est déjà pris`);
    else ids.add(p.id);
    texte(erreurs, `${chemin}.nom`, p.nom);
    verifierDescription(erreurs, `${chemin}.description`, p.description);
    if (p.portrait !== undefined && (typeof p.portrait !== "string" || !PORTRAIT_SUR.test(p.portrait))) {
      erreurs.push(`${chemin}.portrait : cinema/personnages/<id>.jpg ou .png (posé par GEN MOTION)`);
    }
  });
  return ids;
}

function borner(erreurs: Erreurs, chemin: string, liste: unknown[], bornes: { min: number; max: number }, quoi: string): void {
  if (liste.length < bornes.min || liste.length > bornes.max) {
    erreurs.push(`${chemin} : ${bornes.min} à ${bornes.max} ${quoi}, ${liste.length} reçus`);
  }
}

/** Les erreurs du cinéma IA ; fiche sans cinéma : rien à dire. */
export function erreursDuCinema(spec: unknown): string[] {
  if (!estObjet(spec)) return ["la fiche du film doit être un objet"];
  const cinema = spec.cinema;
  if (cinema === undefined) return [];
  if (!estObjet(cinema)) return ["cinema : objet attendu"];

  const erreurs: Erreurs = [];
  const personnagesConnus = verifierPersonnages(erreurs, cinema.personnages);
  if (cinema.objet !== undefined) verifierDescription(erreurs, "cinema.objet", cinema.objet);
  const budget = cinema.budget;
  if (budget !== undefined && (typeof budget !== "number" || !Number.isInteger(budget) || budget < 1 || budget > BUDGET_MAX)) {
    erreurs.push(`cinema.budget : nombre entier de plans, de 1 à ${BUDGET_MAX}`);
  }
  if (!Array.isArray(cinema.episodes)) {
    erreurs.push("cinema.episodes : liste attendue");
    return erreurs;
  }
  borner(erreurs, "cinema.episodes", cinema.episodes, { min: 1, max: EPISODES_MAX }, "épisodes");

  const contexte = { personnagesConnus, objetDecrit: estTexte(cinema.objet) };
  // Un plan donne son nom à son fichier : son id est unique dans TOUT le film.
  const idsDePlans = new Set<unknown>();
  cinema.episodes.forEach((episode: unknown, e: number) => {
    const cheminE = `cinema.episodes[${e}]`;
    const ep = estObjet(episode) ? episode : {};
    texte(erreurs, `${cheminE}.id`, ep.id);
    texte(erreurs, `${cheminE}.titre`, ep.titre);
    const scenes = Array.isArray(ep.scenes) ? ep.scenes : [];
    borner(erreurs, `${cheminE}.scenes`, scenes, SCENES_PAR_EPISODE, "scènes");
    scenes.forEach((scene: unknown, s: number) => {
      const cheminS = `${cheminE}.scenes[${s}]`;
      const sc = estObjet(scene) ? scene : {};
      texte(erreurs, `${cheminS}.id`, sc.id);
      verifierDescription(erreurs, `${cheminS}.decor`, sc.decor);
      const plans = Array.isArray(sc.plans) ? sc.plans : [];
      borner(erreurs, `${cheminS}.plans`, plans, PLANS_PAR_SCENE, "plans");
      plans.forEach((plan: unknown, p: number) => {
        const cheminP = `${cheminS}.plans[${p}]`;
        verifierPlan(erreurs, cheminP, plan, contexte);
        const id = estObjet(plan) ? plan.id : undefined;
        if (idsDePlans.has(id)) erreurs.push(`${cheminP}.id : « ${String(id)} » est déjà pris dans ce film`);
        idsDePlans.add(id);
      });
    });
  });
  return erreurs;
}
