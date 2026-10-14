import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { serieDeDepart } from "../cinema/edition-serie";
import { ficheValide } from "../film-fixtures.test-utils";
import type { LectureDuSite } from "./lecture-du-site";
import { briefDepuisLeSite, serieVierge } from "./serie-du-site";

function lecture(paragraphes: string[] = ["Une maison de parfums naturels autour de l'hibiscus."]): LectureDuSite {
  return {
    url: "https://maisonsayasignature.com",
    titre: "SAYA",
    description: "Haute parfumerie naturelle, l'hibiscus en signature.",
    langue: "fr",
    nomDuSite: "Maison Saya Signature",
    logos: [],
    couleurs: [],
    polices: [],
    liens: [],
    textes: { titres: ["L'hibiscus en signature", "Nos créations"], paragraphes, boutons: [], chiffres: [] },
  };
}

describe("serieVierge", () => {
  it("vierge : pas de série, ou seulement l'épisode d'exemple jamais touché", () => {
    const spec = ficheValide();
    expect(serieVierge(spec)).toBe(true);
    spec.cinema = serieDeDepart();
    expect(serieVierge(spec)).toBe(true);
  });

  it("commencée : un personnage, un objet, ou un épisode retouché, et on n'y touche plus", () => {
    const spec = ficheValide();
    spec.cinema = serieSaya();
    expect(serieVierge(spec)).toBe(false);
    spec.cinema = serieDeDepart();
    spec.cinema.episodes[0].titre = "Mon épisode";
    expect(serieVierge(spec)).toBe(false);
  });
});

describe("briefDepuisLeSite", () => {
  it("la consigne d'abord, puis ce que la marque dit d'elle-même", () => {
    const brief = briefDepuisLeSite(lecture());
    expect(brief.split("\n")[0]).toContain("Écris un premier épisode court");
    expect(brief).toContain("Marque : Maison Saya Signature.");
    expect(brief).toContain("Titres de son site : L'hibiscus en signature / Nos créations.");
    expect(brief).toContain("Une maison de parfums naturels autour de l'hibiscus.");
  });

  it("un site très bavard est coupé à 2000 caractères, sans perdre la consigne", () => {
    const brief = briefDepuisLeSite(lecture(Array.from({ length: 4 }, () => "x".repeat(900))));
    expect(brief.length).toBe(2000);
    expect(brief.startsWith("Écris un premier épisode court")).toBe(true);
  });
});
