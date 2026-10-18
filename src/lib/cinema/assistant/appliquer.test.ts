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

  it("importer-bible ajoute les personnages, les éléments et met les épisodes en attente", () => {
    const cinema = serieSaya();
    appliquerLaProposition(cinema, {
      type: "importer-bible",
      personnages: [{ id: "henrik", nom: "Henrik", description: "x" }],
      elements: [{ id: "sahor", type: "creature", nom: "Sahor", description: "y" }],
      episodes: [{ titre: "Le retour", note: "Henrik revient à Monaco." }],
    });
    expect(cinema.personnages.map((p) => p.id)).toEqual(["awa", "henrik"]);
    expect(cinema.elements).toEqual([{ id: "sahor", type: "creature", nom: "Sahor", description: "y" }]);
    expect(cinema.episodesAVenir).toEqual([{ titre: "Le retour", note: "Henrik revient à Monaco." }]);
  });

  it("importer-bible n'écrase rien de déjà présent, et s'ajoute à une liste d'attente existante", () => {
    const cinema = serieSaya();
    cinema.episodesAVenir = [{ titre: "Déjà en attente", note: "x" }];
    appliquerLaProposition(cinema, {
      type: "importer-bible",
      personnages: [{ id: "awa", nom: "Une autre Awa", description: "collision" }],
      elements: [],
      episodes: [{ titre: "Nouveau", note: "y" }],
    });
    // La collision d'id (la série a bougé entre-temps) est écartée plutôt que doublée.
    expect(cinema.personnages).toHaveLength(1);
    expect(cinema.personnages[0].description).not.toBe("collision");
    expect(cinema.episodesAVenir).toEqual([{ titre: "Déjà en attente", note: "x" }, { titre: "Nouveau", note: "y" }]);
  });

  it("importer-bible écarte aussi une collision de NOM (pas seulement d'id) survenue entre-temps", () => {
    const cinema = serieSaya();
    // La personne a renommé « Personnage 3 » en « Léa » PENDANT que la proposition attendait.
    cinema.personnages.push({ id: "personnage-3", nom: "Léa", description: "x" });
    appliquerLaProposition(cinema, { type: "importer-bible", personnages: [{ id: "lea", nom: "Lea", description: "y" }], elements: [], episodes: [] });
    expect(cinema.personnages).toHaveLength(2);
  });

  it("importer-bible n'ajoute jamais plus que la place restante sous les plafonds, revérifiée au clic", () => {
    const cinema = serieSaya();
    cinema.personnages.push(...Array.from({ length: 29 }, (_, i) => ({ id: `p${i}`, nom: `Personnage ${i}`, description: "x" })));
    appliquerLaProposition(cinema, {
      type: "importer-bible",
      personnages: [{ id: "henrik", nom: "Henrik", description: "x" }, { id: "astrid", nom: "Astrid", description: "y" }],
      elements: [],
      episodes: [],
    });
    expect(cinema.personnages).toHaveLength(30);
  });

  it("importer-bible n'importe pas un épisode déjà écrit ou déjà en attente, revérifié au clic", () => {
    const cinema = serieSaya(); // episodes[0].titre === "L'héritage"
    cinema.episodesAVenir = [{ titre: "Le retour", note: "x" }];
    appliquerLaProposition(cinema, {
      type: "importer-bible",
      personnages: [],
      elements: [],
      episodes: [{ titre: "L'héritage", note: "déjà écrit" }, { titre: "Le retour", note: "déjà en attente" }, { titre: "La trahison", note: "nouveau" }],
    });
    expect(cinema.episodesAVenir).toEqual([{ titre: "Le retour", note: "x" }, { titre: "La trahison", note: "nouveau" }]);
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
