import { describe, expect, it } from "vitest";

import { makeStarterTour, safeHost, slugify } from "./starter-tour";

describe("slugify", () => {
  it("compose un slug à partir d'un nom avec accents et espaces", () => {
    expect(slugify("Maison Saya — Été")).toBe("maison-saya-ete");
  });

  it("ne garde ni tiret de tête ni tiret de fin", () => {
    expect(slugify("  !Bonjour!  ")).toBe("bonjour");
  });

  it("tronque à 60 caractères", () => {
    expect(slugify("a".repeat(100)).length).toBe(60);
  });
});

describe("safeHost", () => {
  it("extrait le nom d'hôte d'une URL valide", () => {
    expect(safeHost("https://mon-app.com/page")).toBe("mon-app.com");
  });

  it("retombe sur localhost si l'URL est invalide", () => {
    expect(safeHost("pas une url")).toBe("localhost");
  });
});

describe("makeStarterTour", () => {
  it("un tour web démarre sur / avec l'URL donnée", () => {
    const tour = makeStarterTour({ id: "mon-app", name: "Mon app", platform: "web", format: "16:9", baseUrl: "https://mon-app.com", appId: "" });
    expect(tour.platform).toBe("web");
    expect(tour.baseUrl).toBe("https://mon-app.com");
    expect(tour.format).toBe("16:9");
  });

  it("un tour mobile force le format 9:16 et lance l'app par son id", () => {
    const tour = makeStarterTour({ id: "mon-app", name: "Mon app", platform: "ios", format: "16:9", baseUrl: "", appId: "com.exemple.app" });
    expect(tour.platform).toBe("ios");
    expect(tour.format).toBe("9:16");
    expect(tour.steps[0]).toEqual({ type: "launchApp", appId: "com.exemple.app" });
  });
});
