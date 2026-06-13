import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync, type KeyObject } from "node:crypto";
import {
  buildLicensePayload,
  signLicensePayload,
  issueLicense,
  LicenseIssueError,
} from "./issue";
import { verifyLicense, resetLicenseCache } from "./verify";

/**
 * Tests du cœur d'émission factorisé (réutilisé par le CLI ET le
 * fulfillment Stripe). On signe avec une keypair jetable et on vérifie
 * le round-trip émission → vérification.
 */

const PUBKEY_ENV = "WEBGEN_MOTION_LICENSE_PUBKEY";

function pemPrivate(priv: KeyObject): string {
  return priv.export({ format: "pem", type: "pkcs8" }) as string;
}
function rawPub(pub: KeyObject): string {
  const jwk = pub.export({ format: "jwk" }) as { x: string };
  return Buffer.from(jwk.x, "base64url").toString("base64");
}

let saved: string | undefined;
beforeEach(() => {
  saved = process.env[PUBKEY_ENV];
  resetLicenseCache();
});
afterEach(() => {
  if (saved === undefined) delete process.env[PUBKEY_ENV];
  else process.env[PUBKEY_ENV] = saved;
  resetLicenseCache();
});

describe("buildLicensePayload", () => {
  it("remplit les défauts (perpétuel, v courante)", () => {
    const p = buildLicensePayload({ email: "a@b.c", edition: "studio" });
    expect(p.v).toBe(1);
    expect(p.edition).toBe("studio");
    expect(p.expiresAt).toBeNull();
    expect(typeof p.issuedAt).toBe("number");
  });

  it("inclut features + note quand fournis", () => {
    const p = buildLicensePayload({
      email: "a@b.c",
      edition: "enterprise",
      features: ["frames-3d", "sso"],
      note: "promo",
    });
    expect(p.features).toEqual(["frames-3d", "sso"]);
    expect(p.note).toBe("promo");
  });

  it("rejette un email manquant", () => {
    expect(() =>
      // @ts-expect-error — email manquant volontaire
      buildLicensePayload({ edition: "studio" }),
    ).toThrow(LicenseIssueError);
  });

  it("rejette une édition non vendable (community)", () => {
    expect(() =>
      // @ts-expect-error — community n'est pas émissible
      buildLicensePayload({ email: "a@b.c", edition: "community" }),
    ).toThrow(LicenseIssueError);
  });
});

describe("signLicensePayload / issueLicense", () => {
  it("produit une licence vérifiable par verifyLicense (round-trip)", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    process.env[PUBKEY_ENV] = rawPub(publicKey);
    const { content, payload } = issueLicense(
      { email: "client@x.io", edition: "studio" },
      pemPrivate(privateKey),
    );
    const r = verifyLicense(content);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.payload.email).toBe("client@x.io");
      expect(r.payload.edition).toBe("studio");
      expect(r.payload.issuedAt).toBe(payload.issuedAt);
    }
  });

  it("une licence signée par une autre clé est rejetée", () => {
    const a = generateKeyPairSync("ed25519");
    const b = generateKeyPairSync("ed25519");
    process.env[PUBKEY_ENV] = rawPub(b.publicKey); // on vérifie contre B
    const { content } = issueLicense(
      { email: "client@x.io", edition: "studio" },
      pemPrivate(a.privateKey), // mais signé par A
    );
    expect(verifyLicense(content).valid).toBe(false);
  });

  it("lève LicenseIssueError sur une private key invalide", () => {
    const payload = buildLicensePayload({ email: "a@b.c", edition: "studio" });
    expect(() => signLicensePayload(payload, "pas une vraie clé PEM")).toThrow(
      LicenseIssueError,
    );
  });
});
