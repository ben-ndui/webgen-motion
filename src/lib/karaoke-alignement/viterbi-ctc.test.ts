import { describe, expect, it } from "vitest";

import { type Emission, alignerDeForce } from "./viterbi-ctc";

const BLANC = 0;
const FORT = Math.log(0.97);
const FAIBLE = Math.log(0.01);

/** Une écoute où, à chaque trame, une seule classe est nettement entendue. */
function ecouteOu(entendu: number[], classes = 5): Emission {
  const probas = new Float32Array(entendu.length * classes).fill(FAIBLE);
  entendu.forEach((classe, t) => {
    probas[t * classes + classe] = FORT;
  });
  return { probas, trames: entendu.length, classes };
}

describe("l'alignement forcé (Viterbi CTC)", () => {
  it("pose chaque lettre sur les trames où elle est entendue", () => {
    //            0  1  2  3  4  5  6  7
    const ecoute = ecouteOu([0, 1, 1, 0, 0, 2, 0, 0]);
    const { lettres } = alignerDeForce(ecoute, [1, 2], BLANC);
    expect(lettres.map(({ debut, fin }) => [debut, fin])).toEqual([[1, 3], [5, 6]]);
  });

  it("deux lettres identiques de suite restent DEUX lettres (« ll »), séparées par un blanc", () => {
    const ecoute = ecouteOu([1, 1, 0, 1, 1, 0]);
    const { lettres } = alignerDeForce(ecoute, [1, 1], BLANC);
    expect(lettres.map(({ debut, fin }) => [debut, fin])).toEqual([[0, 2], [3, 5]]);
  });

  it("le texte juste ne s'écarte pas de ce que le modèle entend ; un texte faux, si", () => {
    const ecoute = ecouteOu([0, 1, 0, 2, 0]);
    const juste = alignerDeForce(ecoute, [1, 2], BLANC).ecarts;
    const faux = alignerDeForce(ecoute, [3, 4], BLANC).ecarts;
    expect(Math.max(...juste)).toBeCloseTo(0, 5);
    expect(faux.reduce((a, b) => a + b, 0)).toBeGreaterThan(5);
  });

  it("garde l'ordre du texte même quand le modèle entend les lettres à l'envers", () => {
    const ecoute = ecouteOu([2, 2, 0, 1, 1]);
    const { lettres } = alignerDeForce(ecoute, [1, 2], BLANC);
    expect(lettres[0]!.fin).toBeLessThanOrEqual(lettres[1]!.debut);
  });

  it("refuse un texte plus long que le morceau, au lieu d'inventer des temps", () => {
    expect(() => alignerDeForce(ecouteOu([1, 2]), [1, 2, 3], BLANC)).toThrow(/trop court/);
  });

  it("un texte sans lettre lisible ne pose rien", () => {
    expect(alignerDeForce(ecouteOu([0, 0]), [], BLANC).lettres).toEqual([]);
  });

  it("autant de lettres que de trames : une lettre par trame, sans blanc", () => {
    const { lettres } = alignerDeForce(ecouteOu([1, 2, 3]), [1, 2, 3], BLANC);
    expect(lettres.map(({ debut, fin }) => [debut, fin])).toEqual([[0, 1], [1, 2], [2, 3]]);
  });
});
