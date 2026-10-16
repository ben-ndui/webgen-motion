import { LONGUEUR_DE_L_ANNEAU, LONGUEUR_MAX_DU_MOT } from "../../../remotion/film/bibliotheque/validerBibliotheque";
import type { TextesDuFilm } from "../../../remotion/film/spec";
import { LONGUEURS } from "../site/redaction-proposee";

/**
 * Les sections de « Ton histoire » (les six du film, plus les Reels),
 * telles que Claude peut les réécrire une à une. Chaque champ porte la clé que `poserUneSuggestion` sait poser
 * dans la fiche (« bascule.constat », « parcours.2 »…), sa longueur maximale
 * (celle que le plan peut afficher) et ce qu'on attend de lui.
 */
export const SECTIONS = ["probleme", "bascule", "parcours", "moment", "marque", "fin", "reels"] as const;
export type SectionDeLHistoire = (typeof SECTIONS)[number];

// `min` et `unSeulMot` : les règles que le rendu impose déjà (anneau, mot signature des Reels).
export type ChampAReecrire = { cle: string; libelle: string; max: number; min?: number; unSeulMot?: true; consigne: string; actuel: string };

export function estUneSection(valeur: unknown): valeur is SectionDeLHistoire {
  return SECTIONS.includes(valeur as SectionDeLHistoire);
}

/** Ce que la section demande au film, pour Claude. */
export const ROLE_DE_LA_SECTION: Record<SectionDeLHistoire, string> = {
  probleme: "The film opens on a phone conversation between two close people that SHOWS the problem the brand solves. The brand never speaks in it. Each message is different.",
  bascule: "The turning point: what happens today for the customer, a striking fact, and the brand promise.",
  parcours: "One very short caption (2 to 3 words) under each screen of the product journey, in order.",
  moment: "What the product changes for the customer, in one sentence, shown at the key moment.",
  marque: "The brand in three words or very short phrases, one per music beat. The third one stands out.",
  fin: "Where to find the product (the website address, for example).",
  reels: "Short clips posted alone on social networks: a signature word written large, a phrase turning in a ring, captions under the screens of a fan, and a line under the logo.",
};

/** Les champs d'une section, avec leur texte actuel (le contexte de la réécriture). */
export function champsDeLaSection(section: SectionDeLHistoire, t: TextesDuFilm): ChampAReecrire[] {
  switch (section) {
    case "probleme":
      return t.probleme.messages.map((m, i) => ({
        cle: `probleme.messages.${i}`,
        libelle: `Message ${i + 1} (${m.auteur === "moi" ? "me" : "the other person"})`,
        max: LONGUEURS.message,
        consigne: "one short phone message",
        actuel: m.texte,
      }));
    case "bascule":
      return [
        { cle: "bascule.constat", libelle: "Today", max: LONGUEURS.constat, consigne: "what happens today for the customer", actuel: t.bascule.constat },
        { cle: "bascule.chiffre", libelle: "Striking fact", max: LONGUEURS.chiffre, consigne: "a figure TAKEN FROM THE SITE (scale or quality: customers, years, percentage), NEVER a price; null if the site has none", actuel: t.bascule.chiffre },
        { cle: "bascule.signature", libelle: "Promise", max: LONGUEURS.promesse, consigne: "the brand promise in one sentence", actuel: t.bascule.signature },
      ];
    case "parcours":
      return t.parcours.map((legende, i) => ({ cle: `parcours.${i}`, libelle: `Step ${i + 1}`, max: LONGUEURS.parcours, consigne: "2 to 3 words", actuel: legende }));
    case "moment":
      return [{ cle: "evenement.chute", libelle: "What it changes", max: LONGUEURS.momentCle, consigne: "one sentence", actuel: t.evenement.chute }];
    case "marque":
      return t.marque.mots.map((mot, i) => ({ cle: `marque.mots.${i}`, libelle: `Word ${i + 1}`, max: LONGUEURS.troisMots, consigne: "a word or a very short phrase", actuel: mot }));
    case "fin":
      return [{ cle: "fin.disponible", libelle: "Where to find it", max: LONGUEURS.ouTrouver, consigne: "where to find the product", actuel: t.fin.disponible }];
    case "reels": {
      // Pas de Reels dans ce film : rien à réécrire (l'adresse du site, elle, n'est pas un texte à écrire).
      const b = t.bibliotheque;
      if (!b) return [];
      return [
        { cle: "bibliotheque.mot", libelle: "Signature word", max: LONGUEUR_MAX_DU_MOT, unSeulMot: true, consigne: "ONE word that sums up the brand, may end with a period", actuel: b.mot },
        { cle: "bibliotheque.anneau", libelle: "Ring phrase", max: LONGUEUR_DE_L_ANNEAU.max, min: LONGUEUR_DE_L_ANNEAU.min, consigne: "three words separated by « · »", actuel: b.anneau },
        ...b.legendesEventail.map((legende, i) => ({ cle: `bibliotheque.legendesEventail.${i}`, libelle: `Fan caption ${i + 1}`, max: LONGUEURS.legendes, consigne: "2 to 4 words", actuel: legende })),
        { cle: "bibliotheque.signature", libelle: "Line under the logo", max: LONGUEURS.signature, consigne: "one short line", actuel: b.signature },
      ];
    }
  }
}
