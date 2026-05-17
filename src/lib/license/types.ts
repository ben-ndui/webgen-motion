/**
 * Types pour le système de license offline-first webgen-motion.
 * Sprint 9 — Davinci-style perpetual licensing.
 *
 * Format file `.license` (PEM-style) :
 *   -----BEGIN WEBGEN-MOTION LICENSE v1-----
 *   <base64url(JSON.stringify(payload))>.<base64url(ed25519 signature)>
 *   -----END WEBGEN-MOTION LICENSE-----
 *
 * La signature est Ed25519 sur les bytes UTF-8 du base64url(payload).
 * Le public key est embedded dans src/lib/license/public-key.ts.
 */

import type { WebgenMotionEdition } from "../webgen-motion-config-types";
import type { FeatureFlag } from "../edition";

/** Version du format de license. Bump si on change le schéma payload
 *  d'une manière qui casse les anciens parsers — les vieux clients
 *  doivent alors rejeter avec un message clair ("update app to use
 *  this license"). */
export const LICENSE_FORMAT_VERSION = 1 as const;

/** Payload d'une license — JSON sérialisé puis base64url-encodé.
 *  Tous les champs sont obligatoires SAUF `features` (default = tous
 *  les flags de l'edition). */
export interface LicensePayload {
  /** Version du schéma. Doit matcher LICENSE_FORMAT_VERSION sinon
   *  rejet "format inconnu". */
  v: typeof LICENSE_FORMAT_VERSION;
  /** Identifiant du licensee — email ou UUID. Affiché dans la page
   *  Settings de l'app, utile pour le support. */
  email: string;
  /** Edition débloquée par cette license. */
  edition: WebgenMotionEdition;
  /** Unix timestamp ms de l'émission. */
  issuedAt: number;
  /** Unix timestamp ms d'expiration, OU null pour perpetual.
   *  Davinci-style = `null` par défaut (achat one-time). */
  expiresAt: number | null;
  /** Whitelist de features unlockées. Si omis, l'edition décide
   *  (Studio unlock tous les flags `studio`). Utile pour des
   *  licenses "early adopter" qui débloquent un subset. */
  features?: FeatureFlag[];
  /** Optionnel : note libre (campaign, raison). Pas vérifiée. */
  note?: string;
}

/** Résultat d'une tentative de vérification de license. */
export type LicenseVerifyResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; error: LicenseError };

export type LicenseError =
  | "malformed"        // parsing impossible (headers manquants, base64 invalide)
  | "bad-signature"    // signature ne matche pas le payload
  | "unknown-version"  // payload.v != LICENSE_FORMAT_VERSION
  | "expired"          // expiresAt < now
  | "no-public-key";   // public key embed manquant (config issue côté dev)
