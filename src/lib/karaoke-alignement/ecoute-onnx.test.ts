import { describe, expect, it } from "vitest";

import { FENETRE, RECOUVREMENT, TAUX, type Ecouteur, ecouterParFenetres } from "./ecoute-onnx";

const ECHANTILLONS_PAR_TRAME = 320;

/**
 * Un faux modèle qui « entend » la position absolue de chaque trame : chaque
 * échantillon vaut son numéro dans le morceau, et la trame rend celui de son
 * premier échantillon. Il rend autant de trames que le VRAI wav2vec2
 * (première convolution de 400 échantillons, puis un pas de 320) : 999 pour 20 s.
 */
const ecouteurDePositions: Ecouteur = async (extrait) => {
  const trames = Math.floor((extrait.length - 400) / ECHANTILLONS_PAR_TRAME) + 1;
  const probas = new Float32Array(trames);
  for (let t = 0; t < trames; t += 1) probas[t] = extrait[t * ECHANTILLONS_PAR_TRAME]!;
  return { probas, trames, classes: 1 };
};

const morceau = (secondes: number) => Float32Array.from({ length: secondes * TAUX }, (_, i) => i);

describe("écouter un morceau par fenêtres", () => {
  it("un morceau long est recousu sans trame perdue ni doublée (comptées comme le vrai modèle)", async () => {
    const { emission, secondesParTrame } = await ecouterParFenetres(morceau(65), ecouteurDePositions, ECHANTILLONS_PAR_TRAME);
    const positions = Array.from(emission.probas);
    for (let t = 1; t < positions.length; t += 1) expect(positions[t]! - positions[t - 1]!).toBe(ECHANTILLONS_PAR_TRAME);
    expect(positions[0]).toBe(0);
    expect(secondesParTrame).toBeCloseTo(0.02, 3);
  });

  it("chaque fenêtre ne dépasse jamais 20 s : la mémoire reste bornée sur un morceau de 4 min", async () => {
    const longueurs: number[] = [];
    const avancement: number[] = [];
    await ecouterParFenetres(morceau(240), async (extrait) => {
      longueurs.push(extrait.length);
      return ecouteurDePositions(extrait);
    }, ECHANTILLONS_PAR_TRAME, (fraction) => avancement.push(fraction));
    expect(avancement.at(-1)).toBe(1);
    expect(avancement).toEqual([...avancement].sort((a, b) => a - b));
    expect(Math.max(...longueurs)).toBe(FENETRE);
    expect(longueurs.length).toBe(Math.ceil((240 * TAUX - RECOUVREMENT) / (FENETRE - RECOUVREMENT)));
  });

  it("un morceau plus court qu'une fenêtre est écouté d'un coup", async () => {
    let appels = 0;
    const { emission } = await ecouterParFenetres(morceau(5), async (extrait) => {
      appels += 1;
      return ecouteurDePositions(extrait);
    }, ECHANTILLONS_PAR_TRAME);
    expect(appels).toBe(1);
    expect(emission.trames).toBe(Math.floor((5 * TAUX - 400) / ECHANTILLONS_PAR_TRAME) + 1);
  });

  it("un morceau vide est refusé, jamais « calé » sur rien", async () => {
    await expect(ecouterParFenetres(new Float32Array(0), ecouteurDePositions, ECHANTILLONS_PAR_TRAME)).rejects.toThrow(/vide/);
  });
});
