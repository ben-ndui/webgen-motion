// LES REPÈRES du film : à quel temps de la musique chaque texte apparaît
// dans son plan. Les plans les lisent pour animer, la voix off les lit pour
// parler AU MÊME MOMENT : une seule source, la voix ne peut pas se décaler
// de l'image. Ce fichier n'importe que des types.
import type { FilmSpec, Langue } from "./spec";

// Rythmes des plans, en temps (noires) de la musique.
export const TEMPS_PAR_BULLE = 2;
export const TEMPS_PAR_ETAPE = 6;
export const TEMPS_PAR_ETAT = 4;
export const BASCULE = { constat: 0, chiffre: 1.5, signature: 5 } as const;
export const FIN = { disponible: 2.5, contact: 3.5 } as const;
// Une légende du parcours entre un demi-temps après son étape.
export const ENTREE_DE_LEGENDE = 0.5;

/** Le temps où la phrase de chute du moment clé apparaît (après le dernier état). */
export function tempsDeLaChute(etats: number): number {
  return etats * TEMPS_PAR_ETAT - 2;
}

export type Repere = {
  // « bascule.chiffre », « parcours.2 », « marque.mots.1 »…
  cle: string;
  plan: string;
  // Temps de la musique, depuis le début du plan.
  temps: number;
  // Le texte qui apparaît à ce repère, dans cette langue.
  texte: string;
};

/** Tous les repères d'un film, plan par plan, dans l'ordre où ils arrivent. */
export function reperesDuFilm(spec: FilmSpec, langue: Langue): Repere[] {
  const t = spec.textes[langue];
  const nom = spec.marque.logo.type === "motSymbole" ? spec.marque.logo.texte : spec.marque.logo.type === "glyphe" ? spec.marque.logo.logotype : "";
  return [
    { cle: "ouverture.nom", plan: "ouverture", temps: 0, texte: nom },
    ...t.probleme.messages.map((m, i) => ({ cle: `probleme.messages.${i}`, plan: "probleme", temps: i * TEMPS_PAR_BULLE, texte: m.texte })),
    { cle: "bascule.constat", plan: "bascule", temps: BASCULE.constat, texte: t.bascule.constat },
    { cle: "bascule.chiffre", plan: "bascule", temps: BASCULE.chiffre, texte: t.bascule.chiffre },
    { cle: "bascule.signature", plan: "bascule", temps: BASCULE.signature, texte: t.bascule.signature },
    ...t.parcours.map((legende, i) => ({ cle: `parcours.${i}`, plan: "parcours", temps: i * TEMPS_PAR_ETAPE + ENTREE_DE_LEGENDE, texte: legende })),
    { cle: "evenement.chute", plan: "evenement", temps: tempsDeLaChute(spec.ecrans.evenement.length), texte: t.evenement.chute },
    ...t.marque.mots.map((mot, i) => ({ cle: `marque.mots.${i}`, plan: "marque", temps: i, texte: mot })),
    { cle: "fin.disponible", plan: "fin", temps: FIN.disponible, texte: t.fin.disponible },
  ];
}
