import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { saveConfig } from "./config";
import { getPublicConfig } from "./config-public";
import { resolveFalKey } from "./config-resolve";

// Un HOME jetable : le vrai ~/.webgen-motion/config.json n'est jamais touché.
const ORIGINE = { home: process.env.HOME, fal: process.env.FAL_KEY };
let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cfg-fal-"));
  process.env.HOME = home;
  delete process.env.FAL_KEY;
});
afterEach(() => {
  process.env.HOME = ORIGINE.home;
  if (ORIGINE.fal === undefined) delete process.env.FAL_KEY;
  else process.env.FAL_KEY = ORIGINE.fal;
});

const CLE = "fal-cle-de-test-0123456789";

describe("clé fal.ai (Seedance)", () => {
  it("sans clé nulle part : Seedance indisponible", () => {
    expect(resolveFalKey()).toBeNull();
    expect(getPublicConfig().fal).toEqual({ hasApiKey: false, apiKeyMasked: null, hasEnvKey: false });
  });

  it("FAL_KEY prend le relais quand la config est vide", () => {
    process.env.FAL_KEY = CLE;
    expect(resolveFalKey()).toBe(CLE);
    expect(getPublicConfig().fal.hasEnvKey).toBe(true);
  });

  it("la clé des Réglages passe avant celle de l'environnement", () => {
    process.env.FAL_KEY = "fal-autre";
    saveConfig({ fal: { apiKey: CLE } });
    expect(resolveFalKey()).toBe(CLE);
  });

  it("la vue publique ne rend jamais la clé en clair", () => {
    saveConfig({ fal: { apiKey: CLE } });
    const publique = JSON.stringify(getPublicConfig());
    expect(publique).not.toContain(CLE);
    expect(getPublicConfig().fal.apiKeyMasked).toBe(`fal-${"•".repeat(CLE.length - 8)}6789`);
  });

  it("effacer la clé retire la section du fichier, sans toucher au reste (dont Veo)", () => {
    saveConfig({ fal: { apiKey: CLE }, veo: { apiKey: "AQ.gemini" } });
    saveConfig({ fal: { apiKey: undefined } });
    const fichier = JSON.parse(readFileSync(join(home, ".webgen-motion", "config.json"), "utf-8"));
    expect(fichier.fal).toBeUndefined();
    expect(fichier.veo.apiKey).toBe("AQ.gemini");
    expect(resolveFalKey()).toBeNull();
  });

  it("une clé faite d'espaces n'est pas une clé", () => {
    process.env.FAL_KEY = "   ";
    expect(resolveFalKey()).toBeNull();
  });
});
