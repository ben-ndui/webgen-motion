import { describe, expect, it } from "vitest";

import { FILM } from "../film";
import type { FilmSpec } from "../spec";
import { erreursDeLaSpec } from "../validerSpec";
import { erreursDeLaBibliotheque } from "./validerBibliotheque";

// La fiche du film, plus une bibliothèque d'exemple (celle du gabarit) :
// un film qui n'en sert pas (Kandidate) doit quand même éprouver ses règles.
function copie(): FilmSpec {
  const spec = JSON.parse(JSON.stringify(FILM)) as FilmSpec;
  spec.bibliotheque = {
    adresse: "exemple.fr",
    ecranDeLAdresse: "site.png",
    eventail: ["parcours-1.png", "parcours-2.png", "parcours-3.png", "parcours-4.png"],
  };
  spec.textes.fr.bibliotheque = {
    mot: "Livrée.",
    anneau: "Conçue · Codée · Livrée",
    legendesEventail: ["La première étape", "La deuxième", "La troisième", "C'est réglé"],
    signature: "La promesse, en une ligne.",
  };
  spec.textes.en.bibliotheque = {
    mot: "Shipped.",
    anneau: "Designed · Built · Shipped",
    legendesEventail: ["The first step", "The second", "The third", "Sorted"],
    signature: "The promise, in one line.",
  };
  return spec;
}

describe("erreursDeLaBibliotheque", () => {
  it("accepte la bibliothèque d'exemple, et la fiche reste valide pour le film", () => {
    expect(erreursDeLaBibliotheque(copie())).toEqual([]);
    expect(erreursDeLaSpec(copie())).toEqual([]);
  });

  it("n'exige rien d'une fiche sans bibliothèque", () => {
    const spec = copie();
    delete spec.bibliotheque;
    delete spec.textes.fr.bibliotheque;
    delete spec.textes.en.bibliotheque;
    expect(erreursDeLaBibliotheque(spec)).toEqual([]);
  });

  it("signale des textes de bibliothèque orphelins", () => {
    const spec = copie();
    delete spec.bibliotheque;
    expect(erreursDeLaBibliotheque(spec)).toEqual([
      "textes.fr.bibliotheque : présent alors que la fiche n'a pas de « bibliotheque »",
      "textes.en.bibliotheque : présent alors que la fiche n'a pas de « bibliotheque »",
    ]);
  });

  it("exige les textes dans chaque langue", () => {
    const spec = copie();
    delete spec.textes.en.bibliotheque;
    expect(erreursDeLaBibliotheque(spec)).toEqual(["textes.en.bibliotheque : manquant (la fiche a une bibliothèque)"]);
  });

  it("borne l'éventail à 3 à 5 captures, une légende par capture", () => {
    const spec = copie();
    spec.bibliotheque!.eventail = ["a.png", "b.png"];
    expect(erreursDeLaBibliotheque(spec)).toEqual([
      "bibliotheque.eventail : 3 à 5 captures, 2 reçues",
      `textes.fr.bibliotheque.legendesEventail : 2 éléments attendus, ${spec.textes.fr.bibliotheque!.legendesEventail.length} reçus`,
      `textes.en.bibliotheque.legendesEventail : 2 éléments attendus, ${spec.textes.en.bibliotheque!.legendesEventail.length} reçus`,
    ]);
  });

  it("refuse un mot trop long, un anneau hors bornes, une adresse avec son protocole", () => {
    const spec = copie();
    spec.textes.fr.bibliotheque!.mot = "Anticonstitutionnel.";
    spec.textes.fr.bibliotheque!.anneau = "Court";
    spec.bibliotheque!.adresse = "https://exemple.fr";
    expect(erreursDeLaBibliotheque(spec)).toEqual([
      "bibliotheque.adresse : sans « https:// », telle qu'on la lit",
      "textes.fr.bibliotheque.mot : 14 caractères au plus, 20 reçus",
      "textes.fr.bibliotheque.anneau : 8 à 48 caractères, 5 reçus",
    ]);
  });

  it("refuse une signature vide", () => {
    const spec = copie();
    spec.textes.en.bibliotheque!.signature = " ";
    expect(erreursDeLaBibliotheque(spec)).toEqual(["textes.en.bibliotheque.signature : texte non vide attendu"]);
  });
});
