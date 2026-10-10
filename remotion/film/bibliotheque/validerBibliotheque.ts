// Validation de la partie « bibliothèque » de la fiche. À part de validerSpec
// parce que la garde de livraison (scripts/avant-rendu.mjs) lit validerSpec
// avec Node seul, qui n'accepte que des imports de types : ce fichier-ci n'est
// lu que par Remotion et Vitest, il peut importer des fonctions.
import { type Erreurs, estObjet, estTexte, texte, textes } from "../validerSpec";

// Au-delà de cinq téléphones, l'éventail serre les écrans au point qu'on n'en
// lit plus aucun ; en dessous de trois, ce n'est plus un éventail.
export const ECRANS_DE_L_EVENTAIL = { min: 3, max: 5 } as const;
// Au-delà, le mot passe en corps trop petit pour frapper (geometrie.tailleDuMot).
export const LONGUEUR_MAX_DU_MOT = 14;
// Un anneau trop court se répète en bégaiement, trop long il ne fait qu'un tour illisible.
export const LONGUEUR_DE_L_ANNEAU = { min: 8, max: 48 } as const;

/**
 * Les erreurs de la bibliothèque. Fiche sans bibliothèque : rien à dire, sauf
 * si des textes de bibliothèque traînent sans elle (ils ne seraient jamais vus).
 */
export function erreursDeLaBibliotheque(spec: unknown): string[] {
  const erreurs: Erreurs = [];
  if (!estObjet(spec)) return ["la fiche du film doit être un objet"];
  const tous = estObjet(spec.textes) ? spec.textes : {};

  if (spec.bibliotheque === undefined) {
    for (const langue of ["fr", "en"] as const) {
      const t = estObjet(tous[langue]) ? tous[langue] : {};
      if (t.bibliotheque !== undefined) {
        erreurs.push(`textes.${langue}.bibliotheque : présent alors que la fiche n'a pas de « bibliotheque »`);
      }
    }
    return erreurs;
  }

  const b = spec.bibliotheque;
  if (!estObjet(b)) return ["bibliotheque : objet attendu"];
  texte(erreurs, "bibliotheque.adresse", b.adresse);
  if (estTexte(b.adresse) && /^https?:\/\//.test(b.adresse)) {
    erreurs.push("bibliotheque.adresse : sans « https:// », telle qu'on la lit");
  }
  texte(erreurs, "bibliotheque.ecranDeLAdresse", b.ecranDeLAdresse);
  textes(erreurs, "bibliotheque.eventail", b.eventail);
  const nombre = Array.isArray(b.eventail) ? b.eventail.length : 0;
  if (Array.isArray(b.eventail) && (nombre < ECRANS_DE_L_EVENTAIL.min || nombre > ECRANS_DE_L_EVENTAIL.max)) {
    erreurs.push(`bibliotheque.eventail : ${ECRANS_DE_L_EVENTAIL.min} à ${ECRANS_DE_L_EVENTAIL.max} captures, ${nombre} reçues`);
  }

  for (const langue of ["fr", "en"] as const) {
    const chemin = `textes.${langue}.bibliotheque`;
    const t = estObjet(tous[langue]) ? tous[langue] : {};
    if (!estObjet(t.bibliotheque)) {
      erreurs.push(`${chemin} : manquant (la fiche a une bibliothèque)`);
      continue;
    }
    const tb = t.bibliotheque;
    texte(erreurs, `${chemin}.mot`, tb.mot);
    if (estTexte(tb.mot) && tb.mot.trim().length > LONGUEUR_MAX_DU_MOT) {
      erreurs.push(`${chemin}.mot : ${LONGUEUR_MAX_DU_MOT} caractères au plus, ${tb.mot.trim().length} reçus`);
    }
    texte(erreurs, `${chemin}.anneau`, tb.anneau);
    if (estTexte(tb.anneau)) {
      const longueur = tb.anneau.trim().length;
      if (longueur < LONGUEUR_DE_L_ANNEAU.min || longueur > LONGUEUR_DE_L_ANNEAU.max) {
        erreurs.push(
          `${chemin}.anneau : ${LONGUEUR_DE_L_ANNEAU.min} à ${LONGUEUR_DE_L_ANNEAU.max} caractères, ${longueur} reçus`,
        );
      }
    }
    textes(erreurs, `${chemin}.legendesEventail`, tb.legendesEventail, nombre || undefined);
    texte(erreurs, `${chemin}.signature`, tb.signature);
  }
  return erreurs;
}
