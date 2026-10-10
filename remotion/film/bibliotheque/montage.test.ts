import { describe, expect, it } from "vitest";

import { imageDeLaMesure } from "../lib/tempo";
import { MONTAGE_DE_LA_BIBLIOTHEQUE, dureeDeLaBibliotheque } from "./montage";

describe("le montage de la bibliothèque", () => {
  const { plans, glissements } = MONTAGE_DE_LA_BIBLIOTHEQUE;

  it("montre chaque plan une fois, dans l'ordre du Reel R1", () => {
    expect(plans.map((plan) => plan.id)).toEqual(["typo", "adresse", "eventail", "logo"]);
  });

  it("ne glisse que vers des plans du montage, jamais vers le premier", () => {
    const ids = new Set(plans.map((plan) => plan.id));
    for (const id of glissements) expect(ids.has(id)).toBe(true);
    expect(glissements.has(plans[0]!.id)).toBe(false);
  });

  it("dure exactement ses mesures, sans dériver de la musique", () => {
    const mesures = plans.reduce((total, plan) => total + plan.mesures, 0);
    expect(mesures).toBe(11);
    expect(dureeDeLaBibliotheque(123.52)).toBe(imageDeLaMesure(11, 123.52));
  });

  it("laisse à l'éventail le temps de ses cinq légendes (quatre temps + une par temps)", () => {
    const eventail = plans.find((plan) => plan.id === "eventail")!;
    expect(eventail.mesures * 4).toBeGreaterThanOrEqual(4 + 5);
  });
});
