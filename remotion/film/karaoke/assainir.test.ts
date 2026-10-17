import { describe, expect, it } from "vitest";

import { DUREE_MINIMALE_D_UN_MOT, assainir, type LigneCalee } from "./alignement";

const ligne = (...mots: [string, number, number][]): LigneCalee => ({ mots: mots.map(([texte, debut, fin]) => ({ texte, debut, fin })) });
const aPlat = (lignes: LigneCalee[]) => lignes.flatMap((l) => l.mots);

describe("assainir : les impossibilités physiques, quel que soit le style", () => {
  it("une phrase ne commence plus avant que la précédente ait fini (« 10 ANS », 28,04 contre 28,16)", () => {
    const [l4, l5] = assainir([ligne(["des", 27.6, 27.9], ["kilomètres", 27.9, 28.16]), ligne(["Des", 28.04, 28.3], ["kilomètres", 28.3, 28.8])]);
    expect(l4!.mots.at(-1)!.fin).toBeLessThanOrEqual(l5!.mots[0]!.debut);
    expect(l5!.mots[0]!.debut).toBe(28.04);   // le début, plus fiable, ne bouge pas
  });

  it("aucun mot de durée nulle : des mots collés au même instant se partagent le temps", () => {
    const resultat = aPlat(assainir([ligne(["Pour", 32.08, 32.08], ["abattre", 32.08, 32.08], ["je", 32.08, 32.4], ["taille", 32.6, 33])]));
    for (const mot of resultat.slice(0, 3)) expect(mot.fin - mot.debut).toBeGreaterThanOrEqual(DUREE_MINIMALE_D_UN_MOT - 1e-9);
    expect(resultat.map((m) => m.debut)).toEqual([...resultat.map((m) => m.debut)].sort((a, b) => a - b));
    expect(resultat[3]!.debut).toBe(32.6);
  });

  it("une note tenue garde sa durée : rien ne devine une longueur « normale »", () => {
    const [l] = assainir([ligne(["Ohhh", 10, 13.5], ["oui", 14, 14.4])]);
    expect(l!.mots[0]!.fin).toBe(13.5);
  });

  it("un mot n'empiète jamais sur le suivant, et l'ordre est rétabli s'il était cassé", () => {
    const resultat = aPlat(assainir([ligne(["a", 5, 6], ["b", 4.8, 5.5], ["c", 5.4, 7])]));
    for (let i = 1; i < resultat.length; i += 1) {
      expect(resultat[i]!.debut).toBeGreaterThanOrEqual(resultat[i - 1]!.debut);
      expect(resultat[i - 1]!.fin).toBeLessThanOrEqual(resultat[i]!.debut + 1e-9);
    }
  });

  it("ne touche à rien quand tout est déjà juste", () => {
    const juste = [ligne(["On", 1, 1.3], ["avance", 1.4, 2]), ligne(["Toujours", 3, 3.6])];
    expect(assainir(juste)).toEqual(juste);
  });

  it("vide reste vide", () => {
    expect(assainir([])).toEqual([]);
    expect(assainir([{ mots: [] }])).toEqual([{ mots: [] }]);
  });
});
