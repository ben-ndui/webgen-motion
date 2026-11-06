import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import { demandeALAssistant } from "./demandes";
import type { MarqueDuFilm } from "./contexte";

const marque: MarqueDuFilm = { marque: { nom: "SAYA", couleurs: { encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42" } }, direction: "nocturne" } as never;

describe("demandeALAssistant — importer-bible", () => {
  it("demande d'extraire un découpage plan par plan dans la note, et traite un clip unique comme un seul épisode", () => {
    const { systeme } = demandeALAssistant(marque, serieSaya(), { type: "importer-bible", texte: "x" });
    expect(systeme).toContain("single clip or video as a whole");
    expect(systeme).toContain("Shot N: ");
    expect(systeme).toContain("under 2000 characters");
  });
});

describe("demandeALAssistant — episode-suivant", () => {
  it("transmet la règle du découpage plan par plan jusqu'au système de scenario-demande", () => {
    const { systeme } = demandeALAssistant(marque, serieSaya(), { type: "episode-suivant" });
    expect(systeme).toContain("the client's OWN découpage");
  });
});
