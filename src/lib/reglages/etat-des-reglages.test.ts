import { describe, expect, it } from "vitest";

import { etatDesReglages, pageDuReglage, reglagesManquants } from "./etat-des-reglages";

describe("etatDesReglages", () => {
  it("dit, pour chaque réglage, s'il est prêt et où le faire", () => {
    const reglages = etatDesReglages({ claude: true, video: false, voix: false });
    expect(reglages.map((r) => [r.cle, r.pret, r.page])).toEqual([
      ["claude", true, "/setup/agent"],
      ["video", false, "/setup/video"],
      ["voix", false, "/setup"],
    ]);
    expect(reglagesManquants(reglages).map((r) => r.cle)).toEqual(["video", "voix"]);
  });

  it("rien ne manque : la liste des manquants est vide", () => {
    expect(reglagesManquants(etatDesReglages({ claude: true, video: true, voix: true }))).toEqual([]);
  });
});

describe("pageDuReglage", () => {
  it("envoie un message d'erreur vers la page qui règle ce qui manque", () => {
    expect(pageDuReglage("Aucune clé Gemini : ajoute-la dans les Réglages pour générer.")).toBe("/setup/video");
    expect(pageDuReglage("Aucune clé Claude : ajoute-la dans les Réglages pour te faire aider.")).toBe("/setup/agent");
    expect(pageDuReglage("Voix off non configurée")).toBe("/setup");
  });
});
