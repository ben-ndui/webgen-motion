import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getConfig, saveConfig } from "./config";
import { getPublicConfig } from "./config-public";

// Un HOME jetable : le vrai ~/.webgen-motion/config.json n'est jamais touché.
const ORIGINE_HOME = process.env.HOME;
let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cfg-interface-"));
  process.env.HOME = home;
});
afterEach(() => {
  process.env.HOME = ORIGINE_HOME;
});

describe("profil d'interface", () => {
  it("sans réglage : profil complet par défaut", () => {
    expect(getConfig().interface).toBeUndefined();
    expect(getPublicConfig().profilInterface).toBe("complet");
  });

  it("bascule en profil série", () => {
    saveConfig({ interface: { profil: "serie" } });
    expect(getPublicConfig().profilInterface).toBe("serie");
  });

  it("repasser en complet nettoie le fichier normalement, sans toucher aux autres réglages", () => {
    saveConfig({ interface: { profil: "serie" }, agent: { model: "claude-sonnet-4-6" } });
    saveConfig({ interface: { profil: "complet" } });
    const fichier = JSON.parse(readFileSync(join(home, ".webgen-motion", "config.json"), "utf-8"));
    expect(fichier.interface).toEqual({ profil: "complet" });
    expect(fichier.agent.model).toBe("claude-sonnet-4-6");
  });

  it("sauver un autre réglage sans toucher au profil ne crée pas de bloc interface vide", () => {
    saveConfig({ agent: { model: "claude-sonnet-4-6" } });
    const fichier = JSON.parse(readFileSync(join(home, ".webgen-motion", "config.json"), "utf-8"));
    expect(fichier.interface).toBeUndefined();
  });
});
