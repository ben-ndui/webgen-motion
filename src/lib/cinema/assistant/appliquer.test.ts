import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import { erreursDuCinema } from "../../../../remotion/film/cinema/validerCinema";
import { appliquerLaProposition } from "./appliquer";

const plansDe = (cinema: ReturnType<typeof serieSaya>) => cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans));

describe("appliquerLaProposition", () => {
  it("pose la réplique gardée sur son plan", () => {
    const cinema = serieSaya();
    expect(appliquerLaProposition(cinema, { type: "replique", plan: "rangement", replique: { personnage: "awa", texte: "Voilà." } })).toBeNull();
    expect(plansDe(cinema)[0].replique).toEqual({ personnage: "awa", texte: "Voilà." });
  });

  it("refuse si le personnage a quitté le plan pendant que Claude écrivait", () => {
    const cinema = serieSaya();
    plansDe(cinema)[0].personnages = [];
    expect(appliquerLaProposition(cinema, { type: "replique", plan: "rangement", replique: { personnage: "awa", texte: "Voilà." } })).toContain("plus à l'image");
    expect(plansDe(cinema)[0].replique).toBeUndefined();
  });

  it("refuse si le plan a été retiré entre-temps", () => {
    expect(appliquerLaProposition(serieSaya(), { type: "consigne", plan: "disparu", consigne: "x" })).toContain("retiré");
  });

  it("les dialogues posent les répliques ET retirent celles des plans devenus muets", () => {
    const cinema = serieSaya();
    plansDe(cinema)[0].replique = { personnage: "awa", texte: "Ancienne." };
    appliquerLaProposition(cinema, { type: "dialogues", scene: "terrasse", repliques: { confidence: { personnage: "awa", texte: "Nouvelle." } } });
    appliquerLaProposition(cinema, { type: "dialogues", scene: "boutique", repliques: { rangement: null, flacon: null } });
    expect(plansDe(cinema)[0].replique).toBeUndefined();
    expect(plansDe(cinema)[2].replique).toEqual({ personnage: "awa", texte: "Nouvelle." });
  });

  it("le plan suivant s'ajoute en fin de scène, avec un id libre, et la série reste valide", () => {
    const cinema = serieSaya();
    appliquerLaProposition(cinema, { type: "plan-suivant", scene: "terrasse", plan: { consigne: "Awa leaves.", personnages: ["awa"], objet: false } });
    const terrasse = cinema.episodes[0].scenes[1];
    expect(terrasse.plans.at(-1)).toMatchObject({ consigne: "Awa leaves.", personnages: ["awa"] });
    expect(new Set(plansDe(cinema).map((p) => p.id)).size).toBe(plansDe(cinema).length);
    expect(erreursDuCinema({ cinema })).toEqual([]);
  });

  it("decrire-reference pose la description sur le personnage", () => {
    const cinema = serieSaya();
    expect(appliquerLaProposition(cinema, { type: "decrire-reference", reference: "awa", description: "A tall woman with a confident smile." })).toBeNull();
    expect(cinema.personnages[0].description).toBe("A tall woman with a confident smile.");
  });

  it("decrire-reference pose la description sur un élément (créature, objet ou décor)", () => {
    const cinema = serieSaya();
    cinema.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "x" }];
    expect(appliquerLaProposition(cinema, { type: "decrire-reference", reference: "sahor", description: "A black wolf with violet eyes." })).toBeNull();
    expect(cinema.elements[0].description).toBe("A black wolf with violet eyes.");
  });

  it("decrire-reference refuse si la référence a été retirée entre-temps", () => {
    expect(appliquerLaProposition(serieSaya(), { type: "decrire-reference", reference: "disparue", description: "x" })).toContain("retirée");
  });

  it("l'épisode suivant reprend des ids libres, même si la série a grandi entre-temps", () => {
    const cinema = serieSaya();
    // L'épisode a été numéroté contre une série qui n'avait pas encore « plan-1 ».
    cinema.episodes[0].scenes[0].plans[0].id = "plan-1";
    const episode = { id: "ep2", titre: "Le retour", scenes: [{ id: "scene-1", decor: "A market at noon.", plans: [{ id: "plan-1", consigne: "Awa walks.", personnages: ["awa"], objet: false }] }] };
    appliquerLaProposition(cinema, { type: "episode-suivant", episode, nouveauxPersonnages: [] });
    expect(cinema.episodes).toHaveLength(2);
    expect(new Set(plansDe(cinema).map((p) => p.id)).size).toBe(plansDe(cinema).length);
    expect(erreursDuCinema({ cinema })).toEqual([]);
  });
});
