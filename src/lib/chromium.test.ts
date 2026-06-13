import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Tests du résolveur Chromium unifié (P0 dépendances). AUCUN vrai
 * téléchargement : `@puppeteer/browsers` est mocké.
 */

// Mock du module de download : install / getInstalledBrowsers /
// resolveBuildId / detectBrowserPlatform pilotables par test.
const mocks = vi.hoisted(() => ({
  install: vi.fn(),
  getInstalledBrowsers: vi.fn(async () => [] as Array<{ browser: string; executablePath: string }>),
  resolveBuildId: vi.fn(async () => "1234.0.0"),
  detectBrowserPlatform: vi.fn(() => "mac_arm" as string | undefined),
}));
vi.mock("@puppeteer/browsers", () => ({
  install: mocks.install,
  getInstalledBrowsers: mocks.getInstalledBrowsers,
  resolveBuildId: mocks.resolveBuildId,
  detectBrowserPlatform: mocks.detectBrowserPlatform,
  Browser: { CHROME: "chrome" },
}));

import {
  resolveChromiumExecutable,
  ensureChromium,
  detectSystemChrome,
  remotionBrowserArgs,
  ChromiumError,
} from "./chromium";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "chromium-"));
  mocks.install.mockReset();
  mocks.getInstalledBrowsers.mockReset();
  mocks.getInstalledBrowsers.mockResolvedValue([]);
  mocks.resolveBuildId.mockReset();
  mocks.resolveBuildId.mockResolvedValue("1234.0.0");
  mocks.detectBrowserPlatform.mockReset();
  mocks.detectBrowserPlatform.mockReturnValue("mac_arm");
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  delete process.env.WEBGEN_CHROMIUM_BIN;
});

describe("detectSystemChrome", () => {
  it("retourne le premier candidat existant", () => {
    const fake = join(tmp, "chrome");
    writeFileSync(fake, "x");
    expect(detectSystemChrome([join(tmp, "absent"), fake])).toBe(fake);
  });
  it("retourne null si aucun candidat", () => {
    expect(detectSystemChrome([join(tmp, "nope")])).toBeNull();
  });
});

describe("resolveChromiumExecutable", () => {
  it("priorité 1 : override env WEBGEN_CHROMIUM_BIN (s'il existe)", async () => {
    const fake = join(tmp, "my-chrome");
    writeFileSync(fake, "x");
    const r = await resolveChromiumExecutable({
      WEBGEN_CHROMIUM_BIN: fake,
    });
    expect(r).toEqual({ path: fake, source: "env" });
  });

  it("ignore un override env pointant un fichier absent", async () => {
    const r = await resolveChromiumExecutable({
      WEBGEN_CHROMIUM_BIN: join(tmp, "ghost"),
    });
    // pas d'override valide, pas de système (sandbox) → cache vide → null
    expect(r === null || r.source !== "env").toBe(true);
  });

  it("renvoie null quand rien n'est disponible (→ défaut Puppeteer en dev)", async () => {
    const r = await resolveChromiumExecutable({});
    // En sandbox CI : ni override, ni Chrome système, ni cache.
    expect(r === null || r.source === "system").toBe(true);
  });
});

describe("ensureChromium", () => {
  it("réutilise un binaire résolu sans télécharger (env)", async () => {
    const fake = join(tmp, "chrome");
    writeFileSync(fake, "x");
    const r = await ensureChromium({
      env: { WEBGEN_CHROMIUM_BIN: fake },
      cacheDir: tmp,
    });
    expect(r).toEqual({ path: fake, source: "env" });
    expect(mocks.install).not.toHaveBeenCalled();
  });

  it("télécharge si rien n'est résolu, et retourne le chemin installé", async () => {
    const installedPath = join(tmp, "downloaded", "chrome");
    mocks.install.mockResolvedValue({ executablePath: installedPath });
    const r = await ensureChromium({
      env: {},
      cacheDir: tmp,
      systemCandidates: [], // pas de Chrome système (CI en a un installé)
    });
    expect(mocks.install).toHaveBeenCalledTimes(1);
    expect(mocks.install.mock.calls[0][0]).toMatchObject({
      browser: "chrome",
      buildId: "1234.0.0",
      cacheDir: tmp,
    });
    expect(r).toEqual({ path: installedPath, source: "cache" });
  });

  it("lève ChromiumError actionnable si le download échoue", async () => {
    mocks.install.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      ensureChromium({ env: {}, cacheDir: tmp, systemCandidates: [] }),
    ).rejects.toBeInstanceOf(ChromiumError);
  });

  it("lève ChromiumError si la plateforme n'est pas supportée", async () => {
    mocks.detectBrowserPlatform.mockReturnValue(undefined);
    await expect(
      ensureChromium({ env: {}, cacheDir: tmp, systemCandidates: [] }),
    ).rejects.toThrow(/Plateforme non supportée/);
  });
});

describe("remotionBrowserArgs — binaire unifié", () => {
  it("produit --browser-executable=<path> du binaire résolu", () => {
    expect(remotionBrowserArgs("/x/chrome")).toEqual([
      "--browser-executable=/x/chrome",
    ]);
  });
  it("vide si pas de binaire (Remotion garde son défaut en dev)", () => {
    expect(remotionBrowserArgs(null)).toEqual([]);
    expect(remotionBrowserArgs(undefined)).toEqual([]);
  });

  it("Puppeteer et Remotion reçoivent le MÊME chemin résolu", async () => {
    const fake = join(tmp, "chrome");
    writeFileSync(fake, "x");
    const resolved = await resolveChromiumExecutable({
      WEBGEN_CHROMIUM_BIN: fake,
    });
    // capture-tour passe resolved.path en executablePath ; compose-tour
    // passe le même via remotionBrowserArgs → un seul binaire.
    expect(resolved?.path).toBe(fake);
    expect(remotionBrowserArgs(resolved?.path)).toEqual([
      `--browser-executable=${fake}`,
    ]);
  });
});
