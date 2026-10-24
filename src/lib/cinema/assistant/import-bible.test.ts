import { describe, expect, it } from "vitest";

import { serieDeDepart } from "@/lib/cinema/edition-serie";
import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import { lireLImportDeLaBible } from "./import-bible";

describe("lireLImportDeLaBible", () => {
  it("extrait personnages, éléments et épisodes, avec des ids libres", () => {
    const cinema = serieSaya();
    const reponse = {
      personnages: [{ nom: "Henrik", description: "A tall blond man in his forties." }],
      elements: [{ type: "creature", nom: "Sahor", description: "A black wolf with violet eyes." }],
      episodes: [{ titre: "Le retour", note: "Henrik revient à Monaco et retrouve Astrid." }],
    };
    const lecture = lireLImportDeLaBible(cinema, reponse);
    expect(lecture).toMatchObject({
      ok: true,
      proposition: {
        personnages: [{ id: "henrik", nom: "Henrik", description: "A tall blond man in his forties." }],
        elements: [{ id: "sahor", type: "creature", nom: "Sahor", description: "A black wolf with violet eyes." }],
        episodes: [{ titre: "Le retour", note: "Henrik revient à Monaco et retrouve Astrid." }],
      },
    });
  });

  it("écarte un personnage déjà connu (même nom, sans distinguer la casse), ne le duplique pas", () => {
    const cinema = serieSaya(); // a déjà "Awa"
    const reponse = { personnages: [{ nom: "awa", description: "x" }, { nom: "Henrik", description: "y" }] };
    const lecture = lireLImportDeLaBible(cinema, reponse);
    expect(lecture).toMatchObject({ ok: true, proposition: { personnages: [{ nom: "Henrik" }] } });
  });

  it("écarte un élément déjà connu, et un type qui n'existe pas", () => {
    const cinema = serieSaya();
    cinema.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "x" }];
    const reponse = {
      elements: [
        { type: "creature", nom: "Sahor", description: "déjà là" },
        { type: "vehicule", nom: "Le bateau", description: "type inconnu" },
        { type: "decor", nom: "Le palais", description: "A marble palace by the sea." },
      ],
    };
    const lecture = lireLImportDeLaBible(cinema, reponse);
    expect(lecture).toMatchObject({ ok: true, proposition: { elements: [{ id: "le-palais", type: "decor", nom: "Le palais" }] } });
  });

  it("deux personnages du même prénom reçoivent des ids distincts", () => {
    const cinema = serieSaya();
    const reponse = { personnages: [{ nom: "Léa", description: "x" }, { nom: "Léa", description: "y" }] };
    const lecture = lireLImportDeLaBible(cinema, reponse);
    expect(lecture).toMatchObject({ ok: true });
    if (lecture.ok) expect(lecture.proposition.personnages.map((p) => p.id)).toEqual(["lea", "lea-2"]);
  });

  it("tronque une description, un titre ou une note trop longs au lieu de les refuser", () => {
    const cinema = serieSaya();
    const reponse = {
      personnages: [{ nom: "Henrik", description: "x".repeat(900) }],
      episodes: [{ titre: "t".repeat(250), note: "n".repeat(2500) }],
    };
    const lecture = lireLImportDeLaBible(cinema, reponse);
    expect(lecture).toMatchObject({ ok: true });
    if (lecture.ok) {
      expect(lecture.proposition.personnages[0].description).toHaveLength(800);
      expect(lecture.proposition.episodes[0].titre).toHaveLength(200);
      expect(lecture.proposition.episodes[0].note).toHaveLength(2000);
    }
  });

  it("refuse une réponse illisible, ou dont rien n'est exploitable", () => {
    const cinema = serieSaya();
    expect(lireLImportDeLaBible(cinema, "pas un objet")).toMatchObject({ ok: false });
    expect(lireLImportDeLaBible(cinema, {})).toMatchObject({ ok: false, raison: expect.stringContaining("rien trouvé") });
    // Un personnage sans nom, un épisode sans note, un épisode sans titre : rien à garder.
    expect(lireLImportDeLaBible(cinema, { personnages: [{ description: "x" }], episodes: [{ titre: "x" }, { note: "y" }] })).toMatchObject({ ok: false });
  });

  it("écarte un personnage ou un élément SANS description : « Garder » rendrait sinon la fiche invalide", () => {
    const cinema = serieSaya();
    const reponse = {
      personnages: [{ nom: "Henrik", description: "" }, { nom: "Astrid", description: "A woman with sharp green eyes." }],
      elements: [{ type: "creature", nom: "Sahor", description: "   " }],
    };
    const lecture = lireLImportDeLaBible(cinema, reponse);
    expect(lecture).toMatchObject({ ok: true, proposition: { personnages: [{ nom: "Astrid" }], elements: [] } });
  });

  it("reconnaît un nom déjà connu même sans le même accent (« Léa » == « Lea »)", () => {
    const cinema = serieSaya();
    cinema.personnages.push({ id: "lea", nom: "Léa", description: "x" });
    const lecture = lireLImportDeLaBible(cinema, { personnages: [{ nom: "Lea", description: "y" }] });
    expect(lecture).toMatchObject({ ok: false });
  });

  it("n'extrait jamais plus que la place restante sous les plafonds de la série", () => {
    const cinema = serieSaya();
    cinema.personnages.push(
      ...Array.from({ length: 29 }, (_, i) => ({ id: `p${i}`, nom: `Personnage ${i}`, description: "x" })),
    ); // 1 (Awa) + 29 = 30 = PERSONNAGES_MAX, plus de place.
    const lecture = lireLImportDeLaBible(cinema, { personnages: [{ nom: "Henrik", description: "x" }] });
    expect(lecture).toMatchObject({ ok: false });
  });

  it("l'épisode d'exemple d'une série tout juste créée n'écarte pas le vrai « Épisode 1 » d'une bible importée", () => {
    const cinema = serieDeDepart(); // episodes[0].titre === "Épisode 1" (exemple)
    const lecture = lireLImportDeLaBible(cinema, { episodes: [{ titre: "Épisode 1", note: "Henrik découvre son héritage." }] });
    expect(lecture).toMatchObject({ ok: true, proposition: { episodes: [{ titre: "Épisode 1" }] } });
  });

  it("n'importe pas un épisode déjà écrit, ni un déjà en attente, même réimporté deux fois", () => {
    const cinema = serieSaya(); // episodes[0].titre === "L'héritage"
    cinema.episodesAVenir = [{ titre: "Le retour", note: "déjà en attente" }];
    const reponse = { episodes: [{ titre: "L'héritage", note: "déjà écrit" }, { titre: "Le retour", note: "déjà en attente, encore" }, { titre: "La trahison", note: "nouveau" }] };
    const lecture = lireLImportDeLaBible(cinema, reponse);
    expect(lecture).toMatchObject({ ok: true, proposition: { episodes: [{ titre: "La trahison" }] } });
  });
});
