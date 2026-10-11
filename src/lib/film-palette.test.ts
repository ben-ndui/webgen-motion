import { describe, expect, it } from "vitest";

import { CONTRASTE_MINIMUM, contraste, paletteDuFilm, problemesDeLaPalette } from "./film-palette";

describe("palette du film", () => {
  it("mesure le contraste comme WCAG (noir sur blanc = 21)", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contraste("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("les accents de texte se lisent sur leur fond, même avec un accent pâle", () => {
    for (const accent of ["#2F6BFF", "#FFD600", "#C19A42", "#9E2B3B", "#7FFFD4"]) {
      const palette = paletteDuFilm({ encre: "#0A1A2C", clair: "#ECE4D2", accent });
      expect(contraste(palette.accentSurClair, palette.clair)).toBeGreaterThanOrEqual(CONTRASTE_MINIMUM);
      expect(contraste(palette.accentSurSombre, palette.encre)).toBeGreaterThanOrEqual(CONTRASTE_MINIMUM);
    }
  });

  it("garde l'accent tel quel quand il se lit déjà", () => {
    const palette = paletteDuFilm({ encre: "#000000", clair: "#FFFFFF", accent: "#0041E0" });
    expect(palette.accentSurClair).toBe("#0041E0");
  });

  it("refuse deux fonds qui ne se lisent pas l'un sur l'autre, et une couleur manquante", () => {
    expect(problemesDeLaPalette({ encre: "#777777", clair: "#888888", accent: "#2F6BFF" })[0]).toContain("trop proches");
    expect(problemesDeLaPalette({ encre: "", clair: "#FFFFFF", accent: "#2F6BFF" })).toEqual(["Fond sombre : choisir une couleur"]);
    expect(problemesDeLaPalette({ encre: "#010D23", clair: "#FFFFFF", accent: "#2F6BFF" })).toEqual([]);
  });
});
