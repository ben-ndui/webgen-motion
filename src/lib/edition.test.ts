import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { encodeLicense } from "./license/serialize";
import { LICENSE_FORMAT_VERSION } from "./license/types";
import type { LicensePayload } from "./license/types";

/**
 * Tests du gating d'édition — la barrière commerciale Community vs
 * Studio. On contrôle homedir() (où vit `~/.webgen-motion/.license`)
 * via un mock de node:os pointant sur un dossier temporaire, et on
 * pilote l'override env / le runtime desktop packagé.
 */

const PUBKEY_ENV = "WEBGEN_MOTION_LICENSE_PUBKEY";

// Dossier home factice, réassigné par test.
let fakeHome = "";
vi.mock("node:os", async (importActual) => {
  const actual = await importActual<typeof import("node:os")>();
  return { ...actual, homedir: () => fakeHome, default: { ...actual, homedir: () => fakeHome } };
});

function rawPublicKeyB64(pub: KeyObject): string {
  const jwk = pub.export({ format: "jwk" }) as { x: string };
  return Buffer.from(jwk.x, "base64url").toString("base64");
}

/** Écrit une licence signée valide dans le home factice + set la pub key. */
function installLicense(overrides: Partial<LicensePayload> = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const payload: LicensePayload = {
    v: LICENSE_FORMAT_VERSION,
    email: "client@example.com",
    edition: "studio",
    issuedAt: Date.now(),
    expiresAt: null,
    ...overrides,
  };
  const payloadB64 = encodeLicense(payload, new Uint8Array(64))
    .split("\n")[1]
    .split(".")[0];
  const signature = sign(null, Buffer.from(payloadB64, "utf-8"), privateKey);
  const content = encodeLicense(payload, signature);
  const dir = join(fakeHome, ".webgen-motion");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".license"), content);
  process.env[PUBKEY_ENV] = rawPublicKeyB64(publicKey);
}

const ENV_KEYS = [
  "WEBGEN_MOTION_EDITION",
  "WEBGEN_RUNNERS_DIR",
  PUBKEY_ENV,
] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  fakeHome = mkdtempSync(join(tmpdir(), "edition-home-"));
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  vi.resetModules();
});
afterEach(() => {
  rmSync(fakeHome, { recursive: true, force: true });
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

/** Import frais du module (cache module + cache edition réinitialisés). */
async function freshEdition() {
  vi.resetModules();
  const mod = await import("./edition");
  mod.resetEditionCache();
  return mod;
}

describe("getEdition — résolution", () => {
  it("défaut = community quand rien n'est configuré", async () => {
    const { getEdition } = await freshEdition();
    expect(getEdition()).toBe("community");
  });

  it("override env WEBGEN_MOTION_EDITION=studio en dev/self-host", async () => {
    process.env.WEBGEN_MOTION_EDITION = "studio";
    const { getEdition, resolveEdition } = await freshEdition();
    expect(getEdition()).toBe("studio");
    expect(resolveEdition().source).toBe("env");
  });

  it("NEUTRALISE l'override env en desktop packagé (anti-triche)", async () => {
    // Lancer l'app avec WEBGEN_MOTION_EDITION=studio NE doit PAS
    // débloquer Studio sans licence quand on est dans la coque Tauri.
    process.env.WEBGEN_RUNNERS_DIR = "/some/bundle/runners";
    process.env.WEBGEN_MOTION_EDITION = "studio";
    const { getEdition } = await freshEdition();
    expect(getEdition()).toBe("community");
  });

  it("débloque Studio via une licence signée valide (achat payé)", async () => {
    installLicense({ edition: "studio" });
    const { getEdition, resolveEdition } = await freshEdition();
    expect(getEdition()).toBe("studio");
    expect(resolveEdition().source).toBe("license");
    expect(resolveEdition().license?.email).toBe("client@example.com");
  });

  it("retombe en community si la licence payée est expirée", async () => {
    installLicense({ edition: "studio", expiresAt: Date.now() - 1000 });
    const { getEdition, resolveEdition } = await freshEdition();
    expect(getEdition()).toBe("community");
    expect(resolveEdition().licenseError).toBe("expired");
  });

  it("retombe en community si la licence est falsifiée (mauvaise clé)", async () => {
    installLicense({ edition: "studio" });
    process.env[PUBKEY_ENV] = rawPublicKeyB64(
      generateKeyPairSync("ed25519").publicKey,
    ); // mauvaise pub key
    const { getEdition, resolveEdition } = await freshEdition();
    expect(getEdition()).toBe("community");
    expect(resolveEdition().licenseError).toBe("bad-signature");
  });
});

describe("isFeatureEnabled — gating Studio", () => {
  const STUDIO_ONLY = [
    "compose-cinematic",
    "compose-glitch",
    "frames-3d",
    "multi-format-export",
    "music-library",
    "watermark-removal",
    "otio-export",
  ] as const;
  const COMMUNITY = [
    "compose-sober",
    "compose-energetic",
    "format-16-9",
    "format-9-16",
    "agent-ia-byok",
  ] as const;

  it("free : les features payantes sont BLOQUÉES", async () => {
    const { isFeatureEnabled } = await freshEdition();
    for (const f of STUDIO_ONLY) expect(isFeatureEnabled(f)).toBe(false);
    for (const f of COMMUNITY) expect(isFeatureEnabled(f)).toBe(true);
  });

  it("studio : les features payantes sont DÉBLOQUÉES", async () => {
    installLicense({ edition: "studio" });
    const { isFeatureEnabled } = await freshEdition();
    for (const f of STUDIO_ONLY) expect(isFeatureEnabled(f)).toBe(true);
    for (const f of COMMUNITY) expect(isFeatureEnabled(f)).toBe(true);
  });

  it("enterprise : débloque white-label / api / sso", async () => {
    installLicense({ edition: "enterprise" });
    const { isFeatureEnabled } = await freshEdition();
    expect(isFeatureEnabled("white-label")).toBe(true);
    expect(isFeatureEnabled("api-headless")).toBe(true);
    expect(isFeatureEnabled("sso")).toBe(true);
  });

  it("free : white-label / api / sso restent bloqués", async () => {
    const { isFeatureEnabled } = await freshEdition();
    expect(isFeatureEnabled("white-label")).toBe(false);
    expect(isFeatureEnabled("api-headless")).toBe(false);
    expect(isFeatureEnabled("sso")).toBe(false);
  });
});
