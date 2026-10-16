import { describe, expect, it } from "vitest";

import { PRIX_STUDIO, euros, moisOffertsParLAnnuel } from "./offre-studio";

describe("offre Studio", () => {
  it("l'annuel offre ce qu'il dit : 12 × 15 € = 180 €, contre 120 € → 4 mois", () => {
    expect(PRIX_STUDIO.mensuel * 12 - PRIX_STUDIO.annuel).toBe(60);
    expect(moisOffertsParLAnnuel()).toBe(4);
  });
  it("affiche les montants en euros", () => {
    expect(euros(PRIX_STUDIO.aVie)).toBe("199 €");
  });
});
