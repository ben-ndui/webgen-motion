import { describe, expect, it } from "vitest";

import { type ReleaseGitHub, fichierPour, plateformeDeLAgent, releasePour } from "./release-par-plateforme";

function release(tag: string, date: string, fichiers: string[], options: Partial<ReleaseGitHub> = {}): ReleaseGitHub {
  return {
    tag_name: tag,
    html_url: `https://github.com/x/releases/${tag}`,
    published_at: date,
    body: "",
    draft: false,
    prerelease: false,
    assets: fichiers.map((name) => ({ name, browser_download_url: `https://dl/${tag}/${name}`, size: 1 })),
    ...options,
  };
}

// L'état réel au 16/10/2026 : la 0.7.0 n'a que le DMG Apple Silicon.
const V06 = release("v0.6.0", "2026-09-05T12:36:28Z", [
  "GEN.MOTION_0.6.0_aarch64.dmg", "GEN.MOTION_0.6.0_x64.dmg", "GEN.MOTION_0.6.0_x64-setup.exe", "GEN.MOTION_0.6.0_x64_fr-FR.msi", "GEN.MOTION_0.6.0_amd64.deb",
]);
const V07 = release("v0.7.0", "2026-10-16T13:00:00Z", ["GEN.MOTION_0.7.0_aarch64.dmg"]);
const BROUILLON = release("v0.8.0", "2026-11-01T00:00:00Z", ["GEN.MOTION_0.8.0_x64-setup.exe"], { draft: true });
const RELEASES = [V06, BROUILLON, V07];

describe("releasePour", () => {
  it("chaque plateforme reçoit la release la plus récente qui a SON fichier", () => {
    expect(releasePour(RELEASES, "macos-arm64")?.tag_name).toBe("v0.7.0");
    expect(releasePour(RELEASES, "windows")?.tag_name).toBe("v0.6.0");
    expect(releasePour(RELEASES, "macos-intel")?.tag_name).toBe("v0.6.0");
    expect(releasePour(RELEASES, "linux-deb")?.tag_name).toBe("v0.6.0");
  });

  it("un brouillon ou une préversion ne sert personne", () => {
    expect(releasePour([BROUILLON, V06], "windows")?.tag_name).toBe("v0.6.0");
    expect(releasePour([release("v0.9.0", "2026-12-01T00:00:00Z", ["a_aarch64.dmg"], { prerelease: true })], "macos-arm64")).toBeNull();
  });

  it("sans plateforme : la plus récente publiée", () => {
    expect(releasePour(RELEASES)?.tag_name).toBe("v0.7.0");
  });

  it("aucune release pour cette plateforme : null, pas une autre plateforme", () => {
    expect(releasePour(RELEASES, "linux-appimage")).toBeNull();
    expect(releasePour([], "windows")).toBeNull();
  });
});

describe("fichierPour", () => {
  it("préfère le .msi au .exe sous Windows, et prend le bon DMG sur Mac", () => {
    expect(fichierPour(V06, "windows")?.name).toBe("GEN.MOTION_0.6.0_x64_fr-FR.msi");
    expect(fichierPour(V06, "macos-arm64")?.name).toBe("GEN.MOTION_0.6.0_aarch64.dmg");
    expect(fichierPour(V06, "macos-intel")?.name).toBe("GEN.MOTION_0.6.0_x64.dmg");
  });
});

describe("plateformeDeLAgent", () => {
  it("lit la plateforme d'une app installée qui ne la donne pas", () => {
    expect(plateformeDeLAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120")).toBe("windows");
    expect(plateformeDeLAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15")).toBe("linux");
    expect(plateformeDeLAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15")).toBe("macos");
    expect(plateformeDeLAgent("Mozilla/5.0 (Linux; Android 14)")).toBeUndefined();
    expect(plateformeDeLAgent(null)).toBeUndefined();
  });
});
