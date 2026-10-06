// Le film est découpé en MESURES, pas en secondes : chaque plan commence sur
// un temps fort de la musique. Changer de morceau revient à changer le tempo
// ici : toutes les durées suivent.

export const IMAGES_PAR_SECONDE = 30;

// Tempo de travail tant que le morceau n'est pas choisi (fourchette validée :
// 110 à 122). À remplacer par le tempo mesuré du morceau retenu.
export const TEMPO_PAR_DEFAUT = 116;

const TEMPS_PAR_MESURE = 4;

/** Nombre d'images (fractionnaire) que dure un temps. */
export function imagesParTemps(tempo: number): number {
  if (tempo <= 0) {
    throw new Error(`Tempo invalide : ${tempo}`);
  }
  return (60 / tempo) * IMAGES_PAR_SECONDE;
}

/**
 * Image à laquelle tombe le temps n° `temps` (compté depuis 0).
 *
 * On arrondit la POSITION, pas la durée d'un temps : arrondir la durée puis
 * la multiplier ferait dériver le montage : à 116 BPM, un temps dure 15,52
 * images ; arrondi à 16, la fin du film tomberait avec 14 images de retard
 * sur la musique.
 */
export function imageDuTemps(temps: number, tempo: number = TEMPO_PAR_DEFAUT): number {
  return Math.round(temps * imagesParTemps(tempo));
}

/** Image à laquelle commence la mesure n° `mesure` (comptée depuis 0). */
export function imageDeLaMesure(mesure: number, tempo: number = TEMPO_PAR_DEFAUT): number {
  return imageDuTemps(mesure * TEMPS_PAR_MESURE, tempo);
}

export type Plan = {
  id: string;
  mesures: number;
};

// Générique : un plan placé garde son type précis (l'identifiant typé de
// montages.ts, les instants des rushes de l'aperçu).
export type PlanPlace<P extends Plan = Plan> = P & {
  debut: number;
  duree: number;
};

/**
 * Pose les plans bout à bout, chacun calé sur le début d'une mesure. La durée
 * d'un plan est l'écart entre deux débuts arrondis : aucun trou, aucun
 * chevauchement, et la somme tombe exactement sur la dernière mesure.
 */
export function placerLesPlans<P extends Plan>(plans: P[], tempo: number = TEMPO_PAR_DEFAUT): PlanPlace<P>[] {
  let mesureCourante = 0;
  return plans.map((plan) => {
    if (plan.mesures <= 0) {
      throw new Error(`Le plan « ${plan.id} » doit durer au moins une mesure.`);
    }
    const debut = imageDeLaMesure(mesureCourante, tempo);
    mesureCourante += plan.mesures;
    const fin = imageDeLaMesure(mesureCourante, tempo);
    return { ...plan, debut, duree: fin - debut };
  });
}

/** Durée totale, en images, d'une suite de plans. */
export function dureeTotale(plans: Plan[], tempo: number = TEMPO_PAR_DEFAUT): number {
  const mesures = plans.reduce((total, plan) => total + plan.mesures, 0);
  return imageDeLaMesure(mesures, tempo);
}
