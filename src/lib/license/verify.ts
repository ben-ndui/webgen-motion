/**
 * Vérification offline-first des licenses webgen-motion.
 * Sprint 9 — Davinci-style perpetual licensing.
 *
 * Workflow :
 *  1. decodeLicense(content) → {payload, signature, signedData}
 *  2. createPublicKey(SPKI(embeddedRawKey)) — convertit nos 32 bytes
 *     raw Ed25519 en KeyObject Node.
 *  3. crypto.verify(null, signedData, publicKey, signature) — Ed25519
 *     verify natif. Algo = null car Ed25519 inclut son propre hash.
 *  4. Check expiresAt + version.
 *
 * Cache : les résultats sont gardés en mémoire keyed par hash(content)
 *  pour éviter de re-verify à chaque appel (verify Ed25519 ~0.1ms mais
 *  isFeatureEnabled est appelé en boucle dans les routes). Reset au
 *  resetLicenseCache() — appelé après install/remove pour pas servir
 *  une ancienne décision.
 */

import { createHash, createPublicKey, verify } from "node:crypto";
import { decodeLicense } from "./serialize";
import { getLicensePublicKeyB64 } from "./public-key";
import { LICENSE_FORMAT_VERSION } from "./types";
import type { LicenseVerifyResult } from "./types";

/** Convertit notre base64 (raw 32 bytes Ed25519) en KeyObject Node.
 *  Node attend du SPKI DER pour Ed25519 : préfixe DER fixe + 32 bytes.
 *  Le préfixe est `30 2a 30 05 06 03 2b 65 70 03 21 00` (12 bytes). */
const ED25519_SPKI_PREFIX = Buffer.from([
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
]);

function rawToPublicKey(b64Raw: string) {
  const raw = Buffer.from(b64Raw, "base64");
  if (raw.length !== 32) {
    throw new Error(
      `license public key must be 32 bytes Ed25519 raw, got ${raw.length}`,
    );
  }
  const spki = Buffer.concat([ED25519_SPKI_PREFIX, raw]);
  return createPublicKey({ key: spki, format: "der", type: "spki" });
}

/** Cache mémoire des résultats de verify. */
const cache = new Map<string, LicenseVerifyResult>();

/** Reset le cache. Appeler après install/remove license. */
export function resetLicenseCache(): void {
  cache.clear();
}

/** Vérifie un contenu .license. Retourne payload si valid + non expired. */
export function verifyLicense(content: string): LicenseVerifyResult {
  const cacheKey = createHash("sha256").update(content).digest("hex");
  let result = cache.get(cacheKey);
  if (!result) {
    result = doVerify(content);
    cache.set(cacheKey, result);
  }
  // Le cache porte sur le parse + la signature (coûteux), PAS sur le verdict
  // d'expiration : pour une licence time-boxée (abonnement), on ré-évalue
  // l'expiration à CHAQUE appel, sinon un abo expiré resterait "valid" tant
  // que l'app tourne sans relance.
  if (
    result.valid &&
    result.payload.expiresAt !== null &&
    result.payload.expiresAt < Date.now()
  ) {
    return { valid: false, error: "expired" };
  }
  return result;
}

/**
 * Vérifie format + version + SIGNATURE, mais **ignore l'expiration**.
 * Utilisé par le refresh d'abonnement (B.5) : on doit pouvoir lire le
 * payload (email) d'une licence même expirée pour la renouveler si l'abo
 * Stripe est encore actif. Non caché (rare).
 */
export function verifyLicenseSignature(content: string): LicenseVerifyResult {
  return doVerify(content, true);
}

function doVerify(
  content: string,
  ignoreExpiry = false,
): LicenseVerifyResult {
  // 1. Parse format
  let parsed;
  try {
    parsed = decodeLicense(content);
  } catch (e) {
    return { valid: false, error: "malformed" };
  }
  const { payload, signature, signedData } = parsed;

  // 2. Version check
  if (payload.v !== LICENSE_FORMAT_VERSION) {
    return { valid: false, error: "unknown-version" };
  }

  // 3. Signature check
  const pubB64 = getLicensePublicKeyB64();
  if (!pubB64) {
    return { valid: false, error: "no-public-key" };
  }
  let publicKey;
  try {
    publicKey = rawToPublicKey(pubB64);
  } catch {
    return { valid: false, error: "no-public-key" };
  }
  // Ed25519 : algo arg = null (l'algo embed son hash)
  const ok = verify(null, signedData, publicKey, signature);
  if (!ok) {
    return { valid: false, error: "bad-signature" };
  }

  // 4. Expiration check (sauté pour le refresh, cf. verifyLicenseSignature)
  if (
    !ignoreExpiry &&
    payload.expiresAt !== null &&
    payload.expiresAt < Date.now()
  ) {
    return { valid: false, error: "expired" };
  }

  return { valid: true, payload };
}
