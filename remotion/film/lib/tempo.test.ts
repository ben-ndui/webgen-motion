import { describe, expect, it } from "vitest";

import {
  dureeTotale,
  imageDeLaMesure,
  imageDuTemps,
  imagesParTemps,
  placerLesPlans,
} from "./tempo";

describe("tempo", () => {
  it("un temps à 120 BPM dure 15 images à 30 i/s", () => {
    expect(imagesParTemps(120)).toBe(15);
  });

  it("refuse un tempo nul ou négatif", () => {
    expect(() => imagesParTemps(0)).toThrow();
    expect(() => imagesParTemps(-90)).toThrow();
  });

  it("ne dérive pas : le 116e temps à 116 BPM tombe pile à 60 s", () => {
    // Arrondir la durée d'un temps (15,52 → 16) donnerait 1856, soit ~2 s de retard.
    expect(imageDuTemps(116, 116)).toBe(1800);
  });

  it("une mesure vaut quatre temps", () => {
    expect(imageDeLaMesure(1, 120)).toBe(60);
    expect(imageDeLaMesure(3, 120)).toBe(180);
  });
});

describe("placerLesPlans", () => {
  const plans = [
    { id: "a", mesures: 2 },
    { id: "b", mesures: 3 },
    { id: "c", mesures: 1 },
  ];

  it("pose les plans bout à bout, sans trou ni chevauchement", () => {
    const places = placerLesPlans(plans, 116);
    for (let i = 1; i < places.length; i += 1) {
      const precedent = places[i - 1]!;
      expect(places[i]!.debut).toBe(precedent.debut + precedent.duree);
    }
  });

  it("finit exactement sur la durée totale", () => {
    const places = placerLesPlans(plans, 116);
    const dernier = places[places.length - 1]!;
    expect(dernier.debut + dernier.duree).toBe(dureeTotale(plans, 116));
  });

  it("refuse un plan sans durée", () => {
    expect(() => placerLesPlans([{ id: "vide", mesures: 0 }])).toThrow(/vide/);
  });

  it("rend une liste vide pour aucun plan", () => {
    expect(placerLesPlans([])).toEqual([]);
    expect(dureeTotale([])).toBe(0);
  });
});
