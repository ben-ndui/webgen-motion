import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { serieDeDepart } from "./edition-serie";
import { demandeDeScenario } from "./scenario-demande";
import { ajouterLEpisodeEcrit } from "./scenario-lecture";

// Une réponse de Claude telle qu'on la demande : Awa revient, Léa arrive.
function reponse() {
  return {
    titre: "La visite",
    objet: "An amber perfume bottle",
    personnages: [
      { nom: "Awa", description: "should be ignored, Awa already exists" },
      { nom: "Léa", description: "A young woman with short red hair in a white linen dress." },
    ],
    scenes: [
      {
        decor: "The perfume boutique at closing time, warm lights.",
        plans: [
          { consigne: "Léa pushes the door open.", personnages: ["Léa"], objet: false, replique: null },
          { consigne: "Awa hands her the bottle.", personnages: ["Awa", "Léa"], objet: true, replique: { personnage: "Awa", texte: "Je l'ai faite pour toi." } },
        ],
      },
    ],
  };
}

describe("demandeDeScenario", () => {
  it("donne à Claude la marque, les personnages existants par prénom, et le brief", () => {
    const spec = { marque: { nom: "SAYA", couleurs: { encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42" } }, direction: "nocturne", cinema: serieSaya() } as never;
    const { systeme, message } = demandeDeScenario(spec, "  Une cliente découvre le parfum de sa grand-mère.  ");
    expect(systeme).toContain("Lines of dialogue are in FRENCH");
    expect(systeme).toContain("Never put text, logos");
    expect(message).toContain("Brand: SAYA. Colors: midnight navy blue, gold and ivory. Mood: nocturne.");
    expect(message).toContain("- Awa: A Black woman in her early thirties");
    expect(message).toContain("Brief from the client (in French):\nUne cliente découvre le parfum de sa grand-mère.");
  });
});

describe("ajouterLEpisodeEcrit", () => {
  it("ajoute l'épisode à la série : Awa est REPRISE (elle garde son portrait), Léa est créée", () => {
    const actuel = serieSaya();
    actuel.personnages[0].portrait = "cinema/personnages/awa.jpg";
    const lecture = ajouterLEpisodeEcrit(actuel, reponse());
    if (!lecture.ok) throw new Error(lecture.erreurs.join(" / "));
    expect(lecture.episodeId).toBe("ep2");
    expect(lecture.cinema.personnages.map((p) => [p.id, p.nom, p.portrait])).toEqual([
      ["awa", "Awa", "cinema/personnages/awa.jpg"],
      ["lea", "Léa", undefined],
    ]);
    const plans = lecture.cinema.episodes[1].scenes[0].plans;
    expect(plans.map((p) => p.id)).toEqual(["plan-1", "plan-2"]);
    expect(plans[1]).toMatchObject({ personnages: ["awa", "lea"], objet: true, replique: { personnage: "awa", texte: "Je l'ai faite pour toi." } });
    // L'objet décrit par la marque reste celui de la fiche.
    expect(lecture.cinema.objet).toBe(actuel.objet);
  });

  it("série neuve : l'épisode d'exemple jamais touché disparaît, l'objet proposé est repris", () => {
    const lecture = ajouterLEpisodeEcrit(serieDeDepart(), reponse());
    if (!lecture.ok) throw new Error(lecture.erreurs.join(" / "));
    expect(lecture.cinema.episodes.map((e) => e.id)).toEqual(["ep1"]);
    expect(lecture.cinema.objet).toBe("An amber perfume bottle");
  });

  it("ne garde pas une réplique dite par quelqu'un hors du plan, ni un personnage inconnu", () => {
    const brute = reponse();
    brute.scenes[0].plans[0].replique = { personnage: "Awa", texte: "Bonsoir." };
    brute.scenes[0].plans[0].personnages = ["Léa", "Fantôme"];
    const lecture = ajouterLEpisodeEcrit(serieSaya(), brute);
    if (!lecture.ok) throw new Error(lecture.erreurs.join(" / "));
    const plan = lecture.cinema.episodes[1].scenes[0].plans[0];
    expect(plan.personnages).toEqual(["lea"]);
    expect(plan.replique).toBeUndefined();
  });

  it("un objet à l'image sans objet décrit est ramené à « pas d'objet » (la fiche reste valide)", () => {
    const brute = { ...reponse(), objet: null };
    const lecture = ajouterLEpisodeEcrit({ personnages: [], episodes: [] }, brute);
    if (!lecture.ok) throw new Error(lecture.erreurs.join(" / "));
    expect(lecture.cinema.episodes[0].scenes[0].plans[1].objet).toBe(false);
  });

  it("refuse une réponse vide, illisible ou trop longue, avec une phrase", () => {
    expect(ajouterLEpisodeEcrit(serieSaya(), "texte libre")).toEqual({ ok: false, erreurs: ["la réponse n'est pas un objet JSON"] });
    expect(ajouterLEpisodeEcrit(serieSaya(), { ...reponse(), scenes: [] })).toEqual({ ok: false, erreurs: ["Claude n'a proposé aucun plan"] });
    const longue = reponse();
    longue.scenes = Array.from({ length: 4 }, () => ({ decor: "A room.", plans: Array.from({ length: 3 }, () => ({ consigne: "x", personnages: [], objet: false, replique: null })) }));
    expect(ajouterLEpisodeEcrit(serieSaya(), longue)).toMatchObject({ ok: false, erreurs: [expect.stringContaining("12 plans, 10 au plus")] });
  });

  it("un texte vide de Claude (décor, consigne) rend la série invalide : refus avec la liste du validateur", () => {
    const brute = reponse();
    brute.scenes[0].decor = "";
    const lecture = ajouterLEpisodeEcrit(serieSaya(), brute);
    expect(lecture.ok).toBe(false);
    expect(!lecture.ok && lecture.erreurs[0]).toContain("decor : texte non vide attendu");
  });
});
