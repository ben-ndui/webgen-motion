import { describe, expect, it } from "vitest";

import { etatDesReglages, optionnelsAProposer, pageDuReglage, reglagesManquants } from "./etat-des-reglages";

describe("etatDesReglages", () => {
  it("dit, pour chaque réglage, s'il est prêt et où le faire", () => {
    const reglages = etatDesReglages({ claude: true, video: false, voix: false, paroles: false, karaoke: false });
    expect(reglages.map((r) => [r.cle, r.pret, r.page])).toEqual([
      ["claude", true, "/setup/agent"],
      ["video", false, "/setup/video"],
      ["voix", false, "/setup"],
      ["paroles", false, "/setup/paroles"],
      ["karaoke", false, "/setup/paroles"],
    ]);
    expect(reglagesManquants(reglages).map((r) => r.cle)).toEqual(["video", "voix", "paroles"]);
    expect(optionnelsAProposer(reglages).map((r) => r.cle)).toEqual(["karaoke"]);
  });

  it("le calage mot à mot est optionnel : proposé, jamais compté « à faire »", () => {
    const reglages = etatDesReglages({ claude: true, video: true, voix: true, paroles: true, karaoke: false });
    expect(reglagesManquants(reglages)).toEqual([]);
    expect(reglages.find((r) => r.cle === "karaoke")?.optionnel).toBe(true);
  });

  it("une machine où il ne peut pas tourner (null) ne le voit pas du tout", () => {
    const reglages = etatDesReglages({ claude: true, video: true, voix: true, paroles: true, karaoke: null });
    expect(reglages.map((r) => r.cle)).not.toContain("karaoke");
    expect(optionnelsAProposer(reglages)).toEqual([]);
  });

  it("rien ne manque : la liste des manquants est vide", () => {
    expect(reglagesManquants(etatDesReglages({ claude: true, video: true, voix: true, paroles: true, karaoke: true }))).toEqual([]);
  });
});

describe("pageDuReglage", () => {
  it("envoie un message d'erreur vers la page qui règle ce qui manque", () => {
    expect(pageDuReglage("Aucune clé Gemini : ajoute-la dans les Réglages pour générer.")).toBe("/setup/video");
    expect(pageDuReglage("Aucune clé Claude : ajoute-la dans les Réglages pour te faire aider.")).toBe("/setup/agent");
    expect(pageDuReglage("Voix off non configurée")).toBe("/setup");
    expect(pageDuReglage("whisper.cpp n'est pas installé")).toBe("/setup/paroles");
  });
});
