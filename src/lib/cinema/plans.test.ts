import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import { referencesDuPlan, trouverLePlan } from "./plans";

function avecSahor(): CinemaDuFilm {
  const serie = serieSaya();
  serie.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "A black wolf." }];
  return serie;
}

describe("referencesDuPlan", () => {
  it("absent references : ce sont les personnages du plan, dans l'ordre", () => {
    const serie = serieSaya();
    const plan = trouverLePlan(serie, "rangement")!.plan;
    expect(referencesDuPlan(serie, plan).map((r) => r.id)).toEqual(["awa"]);
  });

  it("references présent : il prime, personnages ET éléments mélangés dans l'ordre donné", () => {
    const serie = avecSahor();
    const plan = trouverLePlan(serie, "rangement")!.plan;
    plan.references = ["sahor", "awa"];
    const presentes = referencesDuPlan(serie, plan);
    expect(presentes.map((r) => r.id)).toEqual(["sahor", "awa"]);
    expect(presentes[0].type).toBe("creature");
    expect(presentes[1].type).toBe("personnage");
  });

  it("un id de references qui ne correspond à rien (personnage retiré) est ignoré, pas planté", () => {
    const serie = serieSaya();
    const plan = trouverLePlan(serie, "rangement")!.plan;
    plan.references = ["awa", "inconnue"];
    expect(referencesDuPlan(serie, plan).map((r) => r.id)).toEqual(["awa"]);
  });

  it("aucun personnage ni references : liste vide", () => {
    const serie = serieSaya();
    const plan = trouverLePlan(serie, "flacon")!.plan;
    expect(referencesDuPlan(serie, plan)).toEqual([]);
  });
});
