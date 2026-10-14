import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { saveConfig } from "./config";
import { getPublicConfig } from "./config-public";
import { resolveVeoKey } from "./config-resolve";

// Un HOME jetable : le vrai ~/.webgen-motion/config.json n'est jamais touché.
const ORIGINE = { home: process.env.HOME, gemini: process.env.GEMINI_API_KEY };
let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cfg-veo-"));
  process.env.HOME = home;
  delete process.env.GEMINI_API_KEY;
});
afterEach(() => {
  process.env.HOME = ORIGINE.home;
  if (ORIGINE.gemini === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = ORIGINE.gemini;
});

const CLE = "AQ.cle-gemini-de-test-0123456789";

describe("clé Veo", () => {
  it("sans clé nulle part : pas de cinéma IA", () => {
    expect(resolveVeoKey()).toBeNull();
    expect(getPublicConfig().veo).toEqual({ hasApiKey: false, apiKeyMasked: null, hasEnvKey: false });
  });

  it("GEMINI_API_KEY prend le relais quand la config est vide", () => {
    process.env.GEMINI_API_KEY = CLE;
    expect(resolveVeoKey()).toBe(CLE);
    expect(getPublicConfig().veo.hasEnvKey).toBe(true);
  });

  it("la clé des Réglages passe avant celle de l'environnement", () => {
    process.env.GEMINI_API_KEY = "AQ.autre";
    saveConfig({ veo: { apiKey: CLE } });
    expect(resolveVeoKey()).toBe(CLE);
  });

  it("la vue publique ne rend jamais la clé en clair", () => {
    saveConfig({ veo: { apiKey: CLE } });
    const publique = JSON.stringify(getPublicConfig());
    expect(publique).not.toContain(CLE);
    expect(getPublicConfig().veo.apiKeyMasked).toBe(`AQ.c${"•".repeat(CLE.length - 8)}6789`);
  });

  it("effacer la clé retire la section du fichier, sans toucher aux autres réglages", () => {
    saveConfig({ veo: { apiKey: CLE }, agent: { model: "claude-sonnet-4-6" } });
    saveConfig({ veo: { apiKey: undefined } });
    const fichier = JSON.parse(readFileSync(join(home, ".webgen-motion", "config.json"), "utf-8"));
    expect(fichier.veo).toBeUndefined();
    expect(fichier.agent.model).toBe("claude-sonnet-4-6");
    expect(resolveVeoKey()).toBeNull();
  });

  it("une clé faite d'espaces n'est pas une clé", () => {
    process.env.GEMINI_API_KEY = "   ";
    expect(resolveVeoKey()).toBeNull();
  });
});
