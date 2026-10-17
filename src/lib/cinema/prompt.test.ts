import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { choisirLeModele, trouverLePlan } from "./plans";
import { composerLePrompt } from "./prompt";

function saya(cinema: CinemaDuFilm = serieSaya()): Pick<FilmSpec, "marque" | "direction" | "cinema"> {
  return {
    direction: "nocturne",
    marque: {
      couleurs: { encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42", accentSurClair: "#A77E2C", accentSurSombre: "#E8C766", bulleRecue: "#E9E9EB" },
      police: "Italiana",
      logo: { type: "motSymbole", texte: "saya", graisse: 400, approche: 0 },
      ombreTelephone: "none",
      contact: "",
    },
    cinema,
  };
}

function promptDe(planId: string, spec = saya()) {
  const situe = trouverLePlan(spec.cinema!, planId);
  if (!situe) throw new Error(`plan ${planId} introuvable`);
  return composerLePrompt(spec, situe.scene, situe.plan);
}

describe("composerLePrompt — série", () => {
  it("un plan avec Awa : décor de la scène, consigne, Awa liée à son portrait n°1, objet, ambiance et palette", () => {
    const { prompt, negatif } = promptDe("rangement");
    const awa = serieSaya().personnages[0];
    expect(prompt).toBe(
      "Cinematic vertical shot of a short drama series. " +
        "The scene takes place in this setting: A small elegant perfume boutique with warm lights and wooden shelves. " +
        "Awa places the bottle on a shelf, then turns toward the camera with a gentle smile. " +
        `Awa (reference image 1): ${awa.description} ` +
        `The object: ${serieSaya().objet} It has no label and no text. ` +
        "Keep this setting all around the characters: A small elegant perfume boutique with warm lights and wooden shelves. " +
        "Never reuse the plain studio background or the pose of the reference images. " +
        "Night atmosphere, deep shadows with warm glowing highlights, moody and elegant. " +
        "Color palette: midnight navy blue, gold and ivory. " +
        "Shallow depth of field, slow camera movement, 35mm film look.",
    );
    expect(negatif).not.toContain("bottle");
    expect(negatif).toContain("subtitles");
  });

  it("la réplique est dite en français, entre guillemets, par le personnage nommé", () => {
    const { prompt, negatif } = promptDe("confidence");
    expect(prompt).toContain("Awa says softly in French: « Ce parfum, c'est l'histoire de ma grand-mère. » Natural lip movement.");
    expect(prompt).not.toContain("The object");
    // Pas d'objet à l'image : Veo ne doit pas en poser un.
    expect(negatif).toContain("bottle");
  });

  it("un plan sans personnage n'en décrit aucun et garde un cadrage de film de marque", () => {
    const { prompt } = promptDe("flacon");
    expect(prompt).toContain("high-end brand film");
    expect(prompt).not.toContain("reference image");
    // Sans personnage, pas de portrait à ne pas recopier : pas de rappel.
    expect(prompt).not.toContain("Keep this setting");
  });

  it("deux personnages : numérotés dans l'ordre du plan (l'ordre des portraits envoyés)", () => {
    const serie = serieSaya();
    serie.personnages.push({ id: "kofi", nom: "Kofi", description: "A tall man in a linen suit." });
    serie.episodes[0].scenes[1].plans[0].personnages = ["kofi", "awa"];
    const { prompt } = promptDe("confidence", saya(serie));
    expect(prompt.indexOf("Kofi (reference image 1)")).toBeGreaterThan(-1);
    expect(prompt.indexOf("Awa (reference image 2)")).toBeGreaterThan(prompt.indexOf("Kofi (reference image 1)"));
  });

  it("la même description d'Awa revient mot pour mot dans tous ses plans", () => {
    const description = serieSaya().personnages[0].description;
    expect(promptDe("rangement").prompt).toContain(description);
    expect(promptDe("confidence").prompt).toContain(description);
  });

  it("une créature citée par plan.references est nommée comme un personnage, mais ne parle jamais", () => {
    const serie = serieSaya();
    serie.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "A black and silver wolf." }];
    serie.episodes[0].scenes[0].plans[0].references = ["awa", "sahor"];
    const { prompt } = promptDe("rangement", saya(serie));
    expect(prompt).toContain("Awa (reference image 1)");
    expect(prompt).toContain("Sahor (reference image 2): A black and silver wolf.");
    expect(prompt).not.toContain("Sahor says");
  });

  it("refuse une fiche sans cinéma", () => {
    const spec = saya();
    const situe = trouverLePlan(spec.cinema!, "flacon")!;
    delete spec.cinema;
    expect(() => composerLePrompt(spec, situe.scene, situe.plan)).toThrow("pas de « cinema »");
  });
});

describe("choisirLeModele", () => {
  it("Fast dès qu'un personnage est à l'image (Lite refuse les portraits), en disant pourquoi", () => {
    const serie = serieSaya();
    expect(choisirLeModele(serie, trouverLePlan(serie, "rangement")!.plan)).toEqual({ qualite: "fast", pourquoi: "Awa est à l'image : Fast garde le même visage." });
    expect(choisirLeModele(serie, trouverLePlan(serie, "flacon")!.plan)).toEqual({ qualite: "lite", pourquoi: "Aucune référence à l'image : le modèle Lite suffit." });
  });

  it("trouverLePlan cherche dans toutes les scènes et rend null pour un plan inconnu", () => {
    const serie = serieSaya();
    expect(trouverLePlan(serie, "confidence")?.scene.id).toBe("terrasse");
    expect(trouverLePlan(serie, "fenetre")).toBeNull();
  });
});
