import { describe, expect, it } from "vitest";

import type { CinemaDuFilm, PlanDeCinema } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { composerLePrompt } from "./prompt";

const PERSONNAGE = "A Black woman with an elegant braided updo, in a midnight navy silk gown embroidered with gold";
const OBJET = "An amber faceted glass perfume bottle with a gold hibiscus-shaped stopper.";

function saya(cinema: Partial<CinemaDuFilm> = {}): Pick<FilmSpec, "marque" | "direction" | "cinema"> {
  return {
    direction: "nocturne",
    marque: {
      couleurs: { encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42", accentSurClair: "#A77E2C", accentSurSombre: "#E8C766", bulleRecue: "#E9E9EB" },
      police: "Italiana",
      logo: { type: "motSymbole", texte: "saya", graisse: 400, approche: 0 },
      ombreTelephone: "none",
      contact: "",
    },
    cinema: { personnage: PERSONNAGE, objet: OBJET, plans: [], ...cinema },
  };
}

const plan = (role: PlanDeCinema["role"], consigne = "She picks a red hibiscus"): PlanDeCinema => ({ id: "p", role, consigne });

describe("composerLePrompt", () => {
  it("une scène : personnage, ambiance de nuit et palette de la marque, sans l'objet", () => {
    const { prompt, negatif } = composerLePrompt(saya(), plan("scene"));
    expect(prompt).toBe(
      "Cinematic vertical shot for a high-end brand film. She picks a red hibiscus. " +
        `The character: ${PERSONNAGE}. ` +
        "Night atmosphere, deep shadows with warm glowing highlights, moody and elegant. " +
        "Color palette: midnight navy blue, gold and ivory. " +
        "Shallow depth of field, slow camera movement, 35mm film look.",
    );
    expect(prompt).not.toContain("perfume");
    expect(negatif).toContain("bottle");
  });

  it("un geste : le personnage ET l'objet, mot pour mot, sans texte sur l'objet", () => {
    const { prompt, negatif } = composerLePrompt(saya(), plan("geste", "She sprays it on her neck."));
    expect(prompt).toContain(`The character: ${PERSONNAGE}.`);
    expect(prompt).toContain(`The object: ${OBJET} It has no label and no text.`);
    expect(negatif).not.toContain("bottle");
    expect(negatif).toContain("letters");
  });

  it("un objet seul : pas de personnage", () => {
    const { prompt } = composerLePrompt(saya(), plan("objet", "On navy velvet, petals falling!"));
    expect(prompt).toContain("product shot");
    expect(prompt).toContain("petals falling!");
    expect(prompt).not.toContain("The character");
  });

  it("le même objet est décrit à l'identique dans deux plans différents", () => {
    const a = composerLePrompt(saya(), plan("geste", "A")).prompt;
    const b = composerLePrompt(saya(), plan("objet", "B")).prompt;
    const extraire = (texte: string) => texte.slice(texte.indexOf("The object:"), texte.indexOf("no text.") + 8);
    expect(extraire(a)).toBe(extraire(b));
  });

  it("sans direction, l'ambiance par défaut ; sans personnage, rien d'inventé", () => {
    const spec = saya({ personnage: undefined });
    delete spec.direction;
    const { prompt } = composerLePrompt(spec, plan("scene"));
    expect(prompt).toContain("Soft natural light");
    expect(prompt).not.toContain("The character");
  });

  it("refuse une fiche sans cinéma", () => {
    const spec = saya();
    delete spec.cinema;
    expect(() => composerLePrompt(spec, plan("scene"))).toThrow("pas de « cinema »");
  });
});

