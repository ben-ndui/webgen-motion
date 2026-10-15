// Le montage d'un épisode : où tombe chaque morceau de plan, en images.
// Module pur (testé) : la composition Episode.tsx ne fait que le jouer.
import { imageDeLaMesure } from "../lib/tempo";
import { type CinemaDuFilm, DUREE_D_UN_PLAN, type PlanDeCinema } from "./types";

// Fondu entre deux scènes (0,4 s à 30 i/s) ; dans une scène, coupe franche.
export const FONDU_ENTRE_SCENES = 12;
// Fondu du dernier plan vers le logo.
export const FONDU_VERS_LE_LOGO = 15;
// Le logo se construit sur deux mesures de la musique (comme dans la bibliothèque).
export const MESURES_DU_LOGO = 2;
// La musique sous une réplique : assez basse pour qu'on comprenne chaque mot.
export const MUSIQUE_SOUS_UNE_REPLIQUE = 0.25;
// Fondu de sortie de la musique, en images.
export const FONDU_DE_LA_MUSIQUE = 45;

/** Un morceau de plan posé sur la timeline de l'épisode. */
export type Morceau = {
  planId: string;
  fichier: string;
  // Image de la timeline où il commence, et sa durée en images.
  debut: number;
  duree: number;
  // Où il commence DANS la vidéo du plan, en images.
  depuis: number;
  // Fondu d'entrée en images (0 : coupe franche).
  fondu: number;
  // Un personnage parle : la musique se baisse dessous.
  replique: boolean;
};

export type MontageDeLEpisode = {
  morceaux: Morceau[];
  // Images où commence le logo, et durée totale de l'épisode.
  debutDuLogo: number;
  duree: number;
  // Un plan montre l'objet imaginé (sans photo réelle) : le rendu porte « APERÇU ».
  objetImagine: boolean;
};

/** Les passages gardés d'un plan, en secondes : sa découpe, coupe retirée. */
export function passagesGardes(plan: PlanDeCinema): [number, number][] {
  const { debut, fin, coupe } = plan.decoupe ?? { debut: 0, fin: DUREE_D_UN_PLAN };
  return coupe ? [[debut, coupe[0]], [coupe[1], fin]] : [[debut, fin]];
}

export function monterLEpisode(cinema: CinemaDuFilm, episodeId: string, tempo: number, fps: number): MontageDeLEpisode {
  const episode = cinema.episodes.find((e) => e.id === episodeId);
  if (!episode) throw new Error(`Épisode « ${episodeId} » introuvable dans la série.`);
  const morceaux: Morceau[] = [];
  let curseur = 0;
  let objetImagine = false;

  episode.scenes.forEach((scene, indexDeScene) => {
    scene.plans.forEach((plan, indexDePlan) => {
      if (!plan.fichier) throw new Error(`Le plan « ${plan.id} » n'a pas encore de vidéo : génère-le avant de rendre l'épisode.`);
      // Seul un plan GÉNÉRÉ avec la photo du vrai produit montre le vrai produit.
      if (plan.objet && !plan.produitReel) objetImagine = true;
      passagesGardes(plan).forEach(([depuis, jusqua], indexDePassage) => {
        // Seul le PREMIER morceau d'une scène (hors première scène) entre en fondu.
        const fondu = indexDeScene > 0 && indexDePlan === 0 && indexDePassage === 0 ? FONDU_ENTRE_SCENES : 0;
        const debut = curseur - fondu;
        const duree = Math.round((jusqua - depuis) * fps);
        morceaux.push({ planId: plan.id, fichier: plan.fichier!, debut, duree, depuis: Math.round(depuis * fps), fondu, replique: plan.replique !== undefined });
        curseur = debut + duree;
      });
    });
  });

  const debutDuLogo = curseur - FONDU_VERS_LE_LOGO;
  return { morceaux, debutDuLogo, duree: debutDuLogo + imageDeLaMesure(MESURES_DU_LOGO, tempo), objetImagine };
}
