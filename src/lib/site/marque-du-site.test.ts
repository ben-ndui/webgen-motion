import { describe, expect, it } from "vitest";

import { devinerLaMarque, lireCouleur, policeDuCatalogue } from "./marque-du-site";

const CATALOGUE = new Set(["Jost", "Italiana", "Inter"]);

describe("deviner la marque d'un site", () => {
  it("lit les écritures de couleur du navigateur, et ignore le transparent", () => {
    expect(lireCouleur("rgb(10, 26, 44)")).toEqual({ r: 10, v: 26, b: 44 });
    expect(lireCouleur("rgba(193, 154, 66, 0.9)")).toEqual({ r: 193, v: 154, b: 66 });
    expect(lireCouleur("rgba(0, 0, 0, 0)")).toBeNull();
    expect(lireCouleur("#C19A42")).toEqual({ r: 193, v: 154, b: 66 });
    expect(lireCouleur("transparent")).toBeNull();
  });

  it("une boutique bleu nuit et or : fond sombre, fond crème, accent or", () => {
    const marque = devinerLaMarque(
      [
        { valeur: "rgb(236, 228, 210)", role: "fond-page", surface: 900_000 },
        { valeur: "rgb(10, 26, 44)", role: "fond-entete", surface: 120_000 },
        { valeur: "rgb(193, 154, 66)", role: "bouton", surface: 8_000 },
        { valeur: "rgb(30, 30, 30)", role: "texte", surface: 1 },
      ],
      ['"Italiana", serif', "Inter, sans-serif"],
      CATALOGUE,
    );
    expect(marque).toMatchObject({ encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42", police: "Italiana" });
    expect(marque.sources).toEqual([]);
  });

  it("un site tout gris : des valeurs par défaut, et il le dit", () => {
    const marque = devinerLaMarque([{ valeur: "rgb(128, 128, 128)", role: "bouton", surface: 10 }], [], CATALOGUE);
    expect(marque.clair).toBe("#FFFFFF");
    expect(marque.accent).toBe(marque.encre);
    expect(marque.police).toBeNull();
    expect(marque.sources.length).toBeGreaterThanOrEqual(2);
  });

  it("prend la première police de la pile qui existe au catalogue", () => {
    expect(policeDuCatalogue(["'Helvetica Neue', Jost, sans-serif"], CATALOGUE)).toBe("Jost");
    expect(policeDuCatalogue(["Comic Sans MS"], CATALOGUE)).toBeNull();
  });
});
