import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { encodeLicense } from "./serialize";
import { verifyLicense, resetLicenseCache } from "./verify";
import { LICENSE_FORMAT_VERSION } from "./types";
import type { LicensePayload } from "./types";

/**
 * Tests du cœur de vérification de licence — c'est ce qui protège le
 * revenu. On génère une keypair Ed25519 jetable, on signe nos propres
 * licences, et on override la public key embarquée via l'env
 * WEBGEN_MOTION_LICENSE_PUBKEY (résolue par getLicensePublicKeyB64).
 */

const PUBKEY_ENV = "WEBGEN_MOTION_LICENSE_PUBKEY";

/** Exporte la public key brute (32 bytes Ed25519) en base64 standard. */
function rawPublicKeyB64(pub: KeyObject): string {
  const jwk = pub.export({ format: "jwk" }) as { x: string };
  return Buffer.from(jwk.x, "base64url").toString("base64");
}

/** Signe un payload et retourne le fichier .license + la pub key b64. */
function makeLicense(
  overrides: Partial<LicensePayload> = {},
  signWith?: KeyObject,
) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const payload: LicensePayload = {
    v: LICENSE_FORMAT_VERSION,
    email: "client@example.com",
    edition: "studio",
    issuedAt: Date.now(),
    expiresAt: null,
    ...overrides,
  };
  const payloadB64 = Buffer.from(
    encodeLicense(payload, new Uint8Array(64)).split("\n")[1].split(".")[0],
    "utf-8",
  );
  // signedData = bytes UTF-8 du base64url(payload) (cf. serialize.ts).
  const signedData = payloadB64;
  const signature = sign(null, signedData, signWith ?? privateKey);
  const content = encodeLicense(payload, signature);
  return { content, pubB64: rawPublicKeyB64(publicKey), payload };
}

let savedEnv: string | undefined;
beforeEach(() => {
  savedEnv = process.env[PUBKEY_ENV];
  resetLicenseCache();
});
afterEach(() => {
  if (savedEnv === undefined) delete process.env[PUBKEY_ENV];
  else process.env[PUBKEY_ENV] = savedEnv;
  resetLicenseCache();
});

describe("verifyLicense", () => {
  it("accepte une licence valide signée par la bonne clé", () => {
    const { content, pubB64, payload } = makeLicense();
    process.env[PUBKEY_ENV] = pubB64;
    const r = verifyLicense(content);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.payload.edition).toBe("studio");
      expect(r.payload.email).toBe(payload.email);
    }
  });

  it("rejette une signature falsifiée (signée par une autre clé)", () => {
    // Licence signée par une clé tierce, mais vérifiée contre la nôtre.
    const attacker = generateKeyPairSync("ed25519").privateKey;
    const { content } = makeLicense({}, attacker);
    const { pubB64 } = makeLicense(); // une autre pub key (la "vraie")
    process.env[PUBKEY_ENV] = pubB64;
    const r = verifyLicense(content);
    expect(r).toEqual({ valid: false, error: "bad-signature" });
  });

  it("rejette un payload altéré après signature (tamper)", () => {
    const { content, pubB64 } = makeLicense({ edition: "community" });
    process.env[PUBKEY_ENV] = pubB64;
    // On gonfle l'édition dans le payload base64 sans re-signer.
    const tampered = content.replace(
      content.split("\n")[1],
      Buffer.from(
        JSON.stringify({
          v: 1,
          email: "client@example.com",
          edition: "enterprise",
          issuedAt: Date.now(),
          expiresAt: null,
        }),
      )
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "") +
        "." +
        content.split("\n")[1].split(".")[1],
    );
    const r = verifyLicense(tampered);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("bad-signature");
  });

  it("rejette une licence expirée (même signature valide)", () => {
    const { content, pubB64 } = makeLicense({
      expiresAt: Date.now() - 1000,
    });
    process.env[PUBKEY_ENV] = pubB64;
    const r = verifyLicense(content);
    expect(r).toEqual({ valid: false, error: "expired" });
  });

  it("accepte une licence perpétuelle (expiresAt null)", () => {
    const { content, pubB64 } = makeLicense({ expiresAt: null });
    process.env[PUBKEY_ENV] = pubB64;
    expect(verifyLicense(content).valid).toBe(true);
  });

  it("rejette une version de format inconnue", () => {
    const { content, pubB64 } = makeLicense({
      // @ts-expect-error — on force une version invalide pour le test
      v: 999,
    });
    process.env[PUBKEY_ENV] = pubB64;
    const r = verifyLicense(content);
    expect(r).toEqual({ valid: false, error: "unknown-version" });
  });

  it("rejette un fichier malformé (headers absents)", () => {
    process.env[PUBKEY_ENV] = makeLicense().pubB64;
    expect(verifyLicense("pas une licence").valid).toBe(false);
    expect(verifyLicense("pas une licence")).toEqual({
      valid: false,
      error: "malformed",
    });
  });

  it("rejette quand la public key embarquée est absente/invalide", () => {
    const { content } = makeLicense();
    process.env[PUBKEY_ENV] = ""; // vide → no-public-key
    expect(verifyLicense(content)).toEqual({
      valid: false,
      error: "no-public-key",
    });
    resetLicenseCache();
    process.env[PUBKEY_ENV] = "not-32-bytes"; // longueur invalide
    expect(verifyLicense(content)).toEqual({
      valid: false,
      error: "no-public-key",
    });
  });

  it("met en cache le résultat par contenu, vidé par resetLicenseCache", () => {
    const { content, pubB64 } = makeLicense();
    process.env[PUBKEY_ENV] = pubB64;
    const first = verifyLicense(content);
    const second = verifyLicense(content);
    expect(second).toBe(first); // même référence = cache hit
    resetLicenseCache();
    const third = verifyLicense(content);
    expect(third).not.toBe(first); // recalculé
    expect(third).toEqual(first); // mais équivalent
  });
});
