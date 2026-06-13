/**
 * Émission de licences webgen-motion — cœur de signature Ed25519,
 * factorisé pour être réutilisé par :
 *   - le CLI backoffice `scripts/issue-license.ts` (émission manuelle) ;
 *   - le webhook Stripe (fulfillment automatique, cf. fulfillment.ts).
 *
 * Source de vérité unique : avant, la logique vivait en double (CLI +
 * tests). Tout passe désormais par `issueLicense()`.
 *
 * Le format produit matche exactement `serialize.ts` / `verify.ts` :
 * base64url(payload).base64url(signature) entre les headers PEM-style.
 */

import { createPrivateKey, sign } from "node:crypto";
import { b64urlEncode, encodeLicense } from "./serialize";
import { LICENSE_FORMAT_VERSION } from "./types";
import type { LicensePayload } from "./types";
import type { WebgenMotionEdition } from "../webgen-motion-config-types";
import type { FeatureFlag } from "../edition";

/** Éditions qu'on peut vendre/émettre (pas community, qui est le défaut gratuit). */
export type IssuableEdition = Exclude<WebgenMotionEdition, "community">;

export interface IssueLicenseOptions {
  /** Identifiant licensee (email du client). */
  email: string;
  /** Édition débloquée. */
  edition: IssuableEdition;
  /** Expiration unix ms, ou null = perpétuel (défaut). */
  expiresAt?: number | null;
  /** Whitelist optionnelle de features. */
  features?: FeatureFlag[];
  /** Note libre (campagne, id session Stripe…). */
  note?: string;
  /** Override de l'horodatage d'émission (tests / reproductibilité). */
  issuedAt?: number;
}

export class LicenseIssueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenseIssueError";
  }
}

/** Construit + valide le payload d'une licence. */
export function buildLicensePayload(opts: IssueLicenseOptions): LicensePayload {
  if (!opts.email || typeof opts.email !== "string") {
    throw new LicenseIssueError("email requis pour émettre une licence");
  }
  if (opts.edition !== "studio" && opts.edition !== "enterprise") {
    throw new LicenseIssueError(
      `edition invalide : "${opts.edition}" (attendu studio | enterprise)`,
    );
  }
  const payload: LicensePayload = {
    v: LICENSE_FORMAT_VERSION,
    email: opts.email,
    edition: opts.edition,
    issuedAt: opts.issuedAt ?? Date.now(),
    expiresAt: opts.expiresAt ?? null,
  };
  if (opts.features && opts.features.length > 0) {
    payload.features = opts.features;
  }
  if (opts.note) {
    payload.note = opts.note;
  }
  return payload;
}

/**
 * Signe un payload avec la private key Ed25519 (PEM PKCS#8) et retourne
 * le fichier `.license` complet. Lève `LicenseIssueError` si la clé est
 * invalide.
 */
export function signLicensePayload(
  payload: LicensePayload,
  privateKeyPem: string | Buffer,
): string {
  // signedData = bytes UTF-8 du base64url(payload), cf. serialize.ts.
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signedData = Buffer.from(payloadB64, "utf-8");
  let privateKey;
  try {
    privateKey = createPrivateKey({
      key: privateKeyPem,
      format: "pem",
      type: "pkcs8",
    });
  } catch (e) {
    throw new LicenseIssueError(
      `private key invalide : ${(e as Error).message}`,
    );
  }
  const signature = sign(null, signedData, privateKey);
  return encodeLicense(payload, signature);
}

/** Construit + signe une licence. Retourne le contenu et le payload. */
export function issueLicense(
  opts: IssueLicenseOptions,
  privateKeyPem: string | Buffer,
): { content: string; payload: LicensePayload } {
  const payload = buildLicensePayload(opts);
  const content = signLicensePayload(payload, privateKeyPem);
  return { content, payload };
}
