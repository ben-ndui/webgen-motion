import { describe, expect, it } from "vitest";

import { direLeTempsRestant, direUneDuree, lireLeTempsRestant, lireLigneDuRendu } from "./suivi-du-rendu";

describe("lireLigneDuRendu", () => {
  it("traduit la progression de Remotion en étape, libellé humain et temps restant", () => {
    expect(lireLigneDuRendu("Rendered 454/810, time remaining: 1m 20s")).toEqual({
      type: "progress",
      etape: "images",
      frames: 454,
      total: 810,
      label: "Image 454 sur 810",
      restant: 80,
    });
    expect(lireLigneDuRendu("Rendered 12/1224")).toMatchObject({ etape: "images", restant: null });
    expect(lireLigneDuRendu("Encoded 1224/1224")).toMatchObject({ type: "progress", etape: "encodage", frames: 1224, label: "Encodage de la vidéo · 1224 sur 1224" });
    expect(lireLigneDuRendu("Bundling 40%")).toEqual({ type: "phase", etape: "preparation", label: "Préparation de la composition · 40 %" });
    expect(lireLigneDuRendu("▶ Film Court-FR (fr, court)")).toMatchObject({ type: "phase", etape: "preparation" });
    expect(lireLigneDuRendu("✓ Done → /x/Court-FR.mp4")).toEqual({ type: "phase", etape: "finalisation", label: "Finalisation…" });
  });

  it("ignore le reste", () => {
    expect(lireLigneDuRendu("")).toBeNull();
    expect(lireLigneDuRendu("  Public dir : /x")).toBeNull();
  });
});

describe("le temps restant", () => {
  it("lit le format de Remotion", () => {
    expect(lireLeTempsRestant("45s")).toBe(45);
    expect(lireLeTempsRestant("1m 20s")).toBe(80);
    expect(lireLeTempsRestant("1h 2m 5s")).toBe(3725);
    expect(lireLeTempsRestant(undefined)).toBeNull();
    expect(lireLeTempsRestant("bientôt")).toBeNull();
  });

  it("le dit comme on le dirait", () => {
    expect(direLeTempsRestant(0.4)).toBe("encore ~1 s");
    expect(direLeTempsRestant(45)).toBe("encore ~45 s");
    expect(direLeTempsRestant(80)).toBe("encore ~1 min 20");
    expect(direLeTempsRestant(120)).toBe("encore ~2 min");
    expect(direLeTempsRestant(3900)).toBe("encore ~1 h 05");
    expect(direLeTempsRestant(3599.6)).toBe("encore ~1 h 00");
    expect(direLeTempsRestant(59.6)).toBe("encore ~1 min");
    expect(direLeTempsRestant(7199)).toBe("encore ~2 h 00");
    expect(direUneDuree(151)).toBe("2 min 31");
  });
});
