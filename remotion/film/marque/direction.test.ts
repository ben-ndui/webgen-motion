import { describe, expect, it } from "vitest";

import { DIRECTIONS } from "../spec";
import { FILM } from "../film";
import { erreursDeLaSpec } from "../validerSpec";
import { couleursDuFilm } from "./couleurs";
import { fondDuFilm, reglagesDeDirection, surfaceDuPlan } from "./direction";

const couleurs = couleursDuFilm(FILM.marque.couleurs);

describe("directions artistiques", () => {
  it("n'inventent aucune teinte : fond, texte et accent viennent de la marque", () => {
    for (const direction of DIRECTIONS) {
      for (const tonalite of ["sombre", "clair"] as const) {
        const surface = surfaceDuPlan(tonalite, reglagesDeDirection(direction), couleurs);
        expect([couleurs.encre, couleurs.clair]).toContain(surface.fond);
        expect([couleurs.encre, couleurs.clair]).toContain(surface.texte);
        expect(surface.texte).not.toBe(surface.fond);
        expect([couleurs.accentSurClair, couleurs.accentSurSombre]).toContain(surface.accentTexte);
      }
    }
  });

  it("« marque » laisse chaque plan dans sa tonalité : le film tel qu'il était", () => {
    const reglages = reglagesDeDirection("marque");
    expect(surfaceDuPlan("sombre", reglages, couleurs)).toMatchObject({ fond: couleurs.encre, texte: couleurs.clair, decor: "aucun" });
    expect(surfaceDuPlan("clair", reglages, couleurs)).toMatchObject({ fond: couleurs.clair, texte: couleurs.encre });
    expect(surfaceDuPlan("clair", reglages, couleurs).titre).toEqual({ fontWeight: 500, letterSpacing: "-0.02em" });
  });

  it("« éditorial » passe tous les plans au clair, « nocturne » tous au sombre", () => {
    for (const tonalite of ["sombre", "clair"] as const) {
      expect(surfaceDuPlan(tonalite, reglagesDeDirection("editorial"), couleurs).fond).toBe(couleurs.clair);
      expect(surfaceDuPlan(tonalite, reglagesDeDirection("nocturne"), couleurs).fond).toBe(couleurs.encre);
    }
  });

  it("l'accent en texte est celui fait pour le fond où il se pose", () => {
    expect(surfaceDuPlan("sombre", reglagesDeDirection("editorial"), couleurs).accentTexte).toBe(couleurs.accentSurClair);
    expect(surfaceDuPlan("clair", reglagesDeDirection("nocturne"), couleurs).accentTexte).toBe(couleurs.accentSurSombre);
  });

  it("le fond du film suit la tonalité imposée", () => {
    expect(fondDuFilm("editorial", couleurs)).toBe(couleurs.clair);
    expect(fondDuFilm("nocturne", couleurs)).toBe(couleurs.encre);
    expect(fondDuFilm("marque", couleurs)).toBe(couleurs.encre);
  });

  it("la fiche accepte les trois directions, et refuse les autres", () => {
    for (const direction of DIRECTIONS) {
      expect(erreursDeLaSpec({ ...FILM, direction })).toEqual([]);
    }
    expect(erreursDeLaSpec({ ...FILM })).toEqual([]);
    expect(erreursDeLaSpec({ ...FILM, direction: "pastel" }).join(" ")).toContain("direction");
  });
});
