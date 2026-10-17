import { describe, expect, it } from "vitest";

import type { ConteSpec } from "../../../remotion/film/conte/spec";
import { erreursDuConte } from "../../../remotion/film/conte/validerConte";
import { ajouterUnAvantage, ajouterUnObjet, constatSansLeTotal, retirerUnAvantage, retirerUnObjet } from "./edition-conte";
import { projetDeDepart } from "./format-loader";

const conte = () => (projetDeDepart("conte", "essai") as { spec: ConteSpec }).spec;

describe("modifier un conte", () => {
  it("ajoute et retire des objets sans sortir de 3 à 8", () => {
    let spec = conte();
    for (let i = 0; i < 5; i += 1) spec = ajouterUnObjet(spec);
    expect(spec.objets).toHaveLength(8);
    for (let i = 0; i < 9; i += 1) spec = retirerUnObjet(spec, 0);
    expect(spec.objets).toHaveLength(3);
    expect(erreursDuConte(spec)).toEqual([]);
  });

  it("un avantage s'ajoute et se retire dans les deux langues à la fois", () => {
    let spec = ajouterUnAvantage(conte());
    expect([spec.textes.fr.avantages.length, spec.textes.en.avantages.length]).toEqual([4, 4]);
    expect(ajouterUnAvantage(spec)).toBe(spec);
    spec = retirerUnAvantage(spec, 0);
    spec = retirerUnAvantage(spec, 0);
    expect([spec.textes.fr.avantages.length, spec.textes.en.avantages.length]).toEqual([2, 2]);
    expect(retirerUnAvantage(spec, 0)).toBe(spec);
  });

  it("signale un constat qui ne cite pas le vrai total du compteur", () => {
    const spec = conte();
    expect(constatSansLeTotal(spec, "fr")).toBe(false);
    spec.textes.fr.constatChiffre = "Des centaines d'offres.";
    expect(constatSansLeTotal(spec, "fr")).toBe(true);
    spec.compteur.total = 1500;
    spec.textes.fr.constatChiffre = "1 500 offres à lire.";
    expect(constatSansLeTotal(spec, "fr")).toBe(false);
  });
});
