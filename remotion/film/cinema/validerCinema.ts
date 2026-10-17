// Validation de la partie « cinema » de la fiche, à part de validerSpec pour
// la même raison que la bibliothèque : ce fichier importe des fonctions.
// La bible (personnages, éléments, style) est dans validerReferences.ts, le
// détail d'un plan dans validerPlan.ts.
import { type Erreurs, estObjet, estTexte, texte } from "../validerSpec";
import { verifierPlan } from "./validerPlan";
import { verifierDescription, verifierLaBible } from "./validerReferences";

export { ELEMENTS_MAX, LONGUEUR_MAX_DE_DESCRIPTION, PERSONNAGES_MAX } from "./validerReferences";

// Bornes d'une SAISON (24 épisodes de 60 à 90 s chez la première cliente) :
// assez larges pour une centaine d'épisodes, assez serrées pour attraper une
// faute de frappe. Un épisode de 90 s = 12 à 20 plans de 8 s, découpe comprise.
export const EPISODES_MAX = 120;
export const SCENES_PAR_EPISODE = { min: 1, max: 12 } as const;
export const PLANS_PAR_SCENE = { min: 1, max: 20 } as const;
export const PLANS_PAR_EPISODE_MAX = 30;
export const BUDGET_PAR_DEFAUT = 20;
// Garde-fou contre une faute de frappe (10 000 au lieu de 1 000) : ~960 $ en
// Fast au plus, soit une saison de 24 × 20 plans refaits une fois sur deux.
export const BUDGET_MAX = 1000;
export const BUDGET_D_IMAGES_PAR_DEFAUT = 100;
// 110 références × 4 vues × quelques versions ; ~0,05 $ l'image.
export const BUDGET_D_IMAGES_MAX = 2000;
export const LONGUEUR_MAX_DU_CARTON = 120;
const PHOTO_DE_L_OBJET_SURE = /^cinema\/objet\.(jpg|png)$/;
const LOGO_DU_CARTON_SUR = /^cinema\/fin\/logo\.(jpg|png)$/;

function borner(erreurs: Erreurs, chemin: string, liste: unknown[], bornes: { min: number; max: number }, quoi: string): void {
  if (liste.length < bornes.min || liste.length > bornes.max) {
    erreurs.push(`${chemin} : ${bornes.min} à ${bornes.max} ${quoi}, ${liste.length} reçus`);
  }
}

function verifierUnPlafond(erreurs: Erreurs, chemin: string, valeur: unknown, max: number, quoi: string): void {
  if (valeur === undefined) return;
  if (typeof valeur !== "number" || !Number.isInteger(valeur) || valeur < 1 || valeur > max) {
    erreurs.push(`${chemin} : nombre entier ${quoi}, de 1 à ${max}`);
  }
}

function verifierLaFin(erreurs: Erreurs, fin: unknown, musique: unknown): void {
  if (musique !== undefined && musique !== "film" && musique !== "aucune") erreurs.push("cinema.musique : « film » ou « aucune »");
  if (fin === undefined) return;
  const f = estObjet(fin) ? fin : {};
  if (f.type === "logo-de-la-marque" || f.type === "aucune") return;
  if (f.type !== "carton") {
    erreurs.push("cinema.fin.type : logo-de-la-marque, carton ou aucune");
    return;
  }
  // Le texte peut être vide pendant qu'on le remplit : le rendu, lui, refuse un carton vide.
  if (typeof f.texte !== "string") erreurs.push("cinema.fin.texte : texte attendu (vide permis)");
  else if (f.texte.length > LONGUEUR_MAX_DU_CARTON) erreurs.push(`cinema.fin.texte : ${LONGUEUR_MAX_DU_CARTON} caractères au plus`);
  if (f.logo !== undefined && (typeof f.logo !== "string" || !LOGO_DU_CARTON_SUR.test(f.logo))) {
    erreurs.push("cinema.fin.logo : cinema/fin/logo.jpg ou .png (posé par GEN MOTION)");
  }
}

/** Les erreurs du cinéma IA ; fiche sans cinéma : rien à dire. */
export function erreursDuCinema(spec: unknown): string[] {
  if (!estObjet(spec)) return ["la fiche du film doit être un objet"];
  const cinema = spec.cinema;
  if (cinema === undefined) return [];
  if (!estObjet(cinema)) return ["cinema : objet attendu"];

  const erreurs: Erreurs = [];
  const ids = verifierLaBible(erreurs, cinema);
  if (cinema.objet !== undefined) verifierDescription(erreurs, "cinema.objet", cinema.objet);
  if (cinema.photoDeLObjet !== undefined && (typeof cinema.photoDeLObjet !== "string" || !PHOTO_DE_L_OBJET_SURE.test(cinema.photoDeLObjet))) {
    erreurs.push("cinema.photoDeLObjet : cinema/objet.jpg ou .png (posée par GEN MOTION)");
  }
  verifierUnPlafond(erreurs, "cinema.budget", cinema.budget, BUDGET_MAX, "de plans");
  verifierUnPlafond(erreurs, "cinema.budgetImages", cinema.budgetImages, BUDGET_D_IMAGES_MAX, "d'images");
  verifierLaFin(erreurs, cinema.fin, cinema.musique);
  if (!Array.isArray(cinema.episodes)) {
    erreurs.push("cinema.episodes : liste attendue");
    return erreurs;
  }
  borner(erreurs, "cinema.episodes", cinema.episodes, { min: 1, max: EPISODES_MAX }, "épisodes");

  const contexte = {
    personnagesConnus: ids.personnages,
    referencesConnues: ids.toutes,
    objetDecrit: estTexte(cinema.objet),
    objetEnPhoto: cinema.photoDeLObjet !== undefined,
  };
  // Un plan donne son nom à ses prises : son id est unique dans TOUT le film.
  const idsDePlans = new Set<unknown>();
  cinema.episodes.forEach((episode: unknown, e: number) => {
    const cheminE = `cinema.episodes[${e}]`;
    const ep = estObjet(episode) ? episode : {};
    texte(erreurs, `${cheminE}.id`, ep.id);
    texte(erreurs, `${cheminE}.titre`, ep.titre);
    const scenes = Array.isArray(ep.scenes) ? ep.scenes : [];
    borner(erreurs, `${cheminE}.scenes`, scenes, SCENES_PAR_EPISODE, "scènes");
    let plansDeLEpisode = 0;
    scenes.forEach((scene: unknown, s: number) => {
      const cheminS = `${cheminE}.scenes[${s}]`;
      const sc = estObjet(scene) ? scene : {};
      texte(erreurs, `${cheminS}.id`, sc.id);
      verifierDescription(erreurs, `${cheminS}.decor`, sc.decor);
      const plans = Array.isArray(sc.plans) ? sc.plans : [];
      borner(erreurs, `${cheminS}.plans`, plans, PLANS_PAR_SCENE, "plans");
      plansDeLEpisode += plans.length;
      plans.forEach((plan: unknown, p: number) => {
        const cheminP = `${cheminS}.plans[${p}]`;
        verifierPlan(erreurs, cheminP, plan, contexte);
        const id = estObjet(plan) ? plan.id : undefined;
        if (idsDePlans.has(id)) erreurs.push(`${cheminP}.id : « ${String(id)} » est déjà pris dans ce film`);
        idsDePlans.add(id);
      });
    });
    if (plansDeLEpisode > PLANS_PAR_EPISODE_MAX) erreurs.push(`${cheminE} : ${PLANS_PAR_EPISODE_MAX} plans au plus par épisode, ${plansDeLEpisode} reçus`);
  });
  return erreurs;
}
