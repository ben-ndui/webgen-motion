// LE RYTHME d'une scène d'explainer : à quel temps de la musique chaque
// élément arrive, depuis le début de la scène. Les composants le lisent pour
// animer, la voix off pour parler au même moment, et la validation pour
// vérifier qu'une scène dure assez longtemps pour tout montrer.
import type { Plan } from "../lib/tempo";
import type { Langue } from "../spec";
import type { ExplainerSpec, MotsDuVisuel } from "./spec";

export const TEMPS_PAR_MESURE = 4;

export const SCENE = {
  pastille: 0,
  visuel: 0.5,
  sousTitre: 2,
  precision: 3,
  // La voix off part avec le visuel : on entend ce qu'on voit arriver.
  voix: 0.5,
} as const;

// Chaque visuel a ses propres temps, après `SCENE.visuel`.
export const CHIFFRE = { valeur: 1.5 } as const;
export const OPPOSITION = { gauche: 0.5, droite: 2, barre: 4 } as const;
export const TAMPON = { tampon: 3 } as const;
export const LISTE = { premier: 1, ecart: 2 } as const;
export const PHRASE_FINALE = { phrase: 1.5 } as const;

// La fin : le logo, puis la signature, puis le contact.
export const FIN = { mesures: 2 } as const;
export const ID_DE_LA_FIN = "fin";

/** Le dernier temps où quelque chose arrive dans la scène : elle doit durer au-delà. */
export function dernierTemps(mots: MotsDuVisuel, aUnePrecision: boolean): number {
  const visuel = (() => {
    switch (mots.type) {
      case "chiffre":
        return SCENE.visuel + CHIFFRE.valeur;
      case "opposition":
        return SCENE.visuel + OPPOSITION.barre;
      case "tampon":
        return SCENE.visuel + TAMPON.tampon;
      case "liste":
        return SCENE.visuel + LISTE.premier + (mots.elements.length - 1) * LISTE.ecart;
      case "phrase":
        return SCENE.visuel + PHRASE_FINALE.phrase;
    }
  })();
  const encadre = mots.type === "phrase" ? 0 : aUnePrecision ? SCENE.precision : SCENE.sousTitre;
  return Math.max(visuel, encadre);
}

/**
 * Les scènes trop courtes pour ce qu'elles montrent, dans une langue. On
 * garde au moins deux temps de lecture après le dernier élément arrivé.
 */
export function scenesTropCourtes(spec: ExplainerSpec, langue: Langue): string[] {
  const LECTURE = 2;
  return spec.scenes
    .filter((scene) => {
      const textes = spec.textes[langue].scenes[scene.id];
      if (!textes) return false;
      const besoin = dernierTemps(textes.mots, Boolean(textes.precision)) + LECTURE;
      return scene.mesures * TEMPS_PAR_MESURE < besoin;
    })
    .map((scene) => scene.id);
}

/** Les plans de la vidéo, dans l'ordre : chaque scène, puis la fin. */
export function plansDeLExplainer(spec: ExplainerSpec): Plan[] {
  return [...spec.scenes.map((scene) => ({ id: scene.id, mesures: scene.mesures })), { id: ID_DE_LA_FIN, mesures: FIN.mesures }];
}
