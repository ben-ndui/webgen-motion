import { describe, expect, it } from "vitest";

import { FILM } from "../film";
import { couleursDuFilm, transparence } from "./couleurs";

describe("couleurs", () => {
  it("transforme un #RRGGBB en rgba", () => {
    expect(transparence("#010D23", 0.6)).toBe("rgba(1, 13, 35, 0.6)");
  });

  it("refuse une couleur écrite autrement", () => {
    expect(() => transparence("#FFF", 0.5)).toThrow(/RRGGBB/);
    expect(() => transparence("rgb(0,0,0)", 0.5)).toThrow(/RRGGBB/);
  });

  it("dérive les nuances de l'encre et du clair de LA fiche, pas d'une constante", () => {
    const couleurs = couleursDuFilm({ ...FILM.marque.couleurs, encre: "#112233", clair: "#FAFAFA" });
    expect(couleurs.encreSecondaire).toBe("rgba(17, 34, 51, 0.6)");
    expect(couleurs.clairLibelle).toBe("rgba(250, 250, 250, 0.45)");
    expect(couleurs.accent).toBe(FILM.marque.couleurs.accent);
  });
});
