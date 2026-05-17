/**
 * Encode/decode le format file .license (PEM-style).
 * Sprint 9 — webgen-motion offline licensing.
 *
 * Format :
 *   -----BEGIN WEBGEN-MOTION LICENSE v1-----
 *   <base64url(payload)>.<base64url(signature)>
 *   -----END WEBGEN-MOTION LICENSE-----
 *
 * Le base64url utilise l'alphabet RFC 4648 §5 (sans padding `=`,
 * `+` → `-`, `/` → `_`). Compatible direct avec JWT/JOSE même si on
 * n'utilise pas la lib jose pour minimiser les deps.
 */

import type { LicensePayload } from "./types";
import { LICENSE_FORMAT_VERSION } from "./types";

const HEADER = `-----BEGIN WEBGEN-MOTION LICENSE v${LICENSE_FORMAT_VERSION}-----`;
const FOOTER = "-----END WEBGEN-MOTION LICENSE-----";

/** base64url encode des bytes UTF-8. */
export function b64urlEncode(input: string | Uint8Array): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** base64url decode → bytes. Throw si input malformé. */
export function b64urlDecode(input: string): Buffer {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

/** Encode payload + signature en format .license PEM-style.
 *  Signature attendue en raw bytes (64 bytes pour Ed25519). */
export function encodeLicense(
  payload: LicensePayload,
  signature: Uint8Array,
): string {
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sigB64 = b64urlEncode(signature);
  return `${HEADER}\n${payloadB64}.${sigB64}\n${FOOTER}\n`;
}

/** Parse un fichier .license en {payload, signature, signedData}.
 *  Throw avec un code clair si malformé. signedData = les bytes
 *  exacts que la signature couvre (= UTF-8 du base64url payload). */
export function decodeLicense(content: string): {
  payload: LicensePayload;
  signature: Buffer;
  signedData: Buffer;
} {
  const trimmed = content.trim();
  if (!trimmed.startsWith(HEADER)) {
    throw new Error("malformed: header missing");
  }
  if (!trimmed.endsWith(FOOTER)) {
    throw new Error("malformed: footer missing");
  }
  const body = trimmed.slice(HEADER.length, trimmed.length - FOOTER.length).trim();
  const dot = body.indexOf(".");
  if (dot < 0) {
    throw new Error("malformed: missing payload.signature separator");
  }
  const payloadB64 = body.slice(0, dot);
  const sigB64 = body.slice(dot + 1);
  const payloadRaw = b64urlDecode(payloadB64);
  let payload: LicensePayload;
  try {
    payload = JSON.parse(payloadRaw.toString("utf-8")) as LicensePayload;
  } catch {
    throw new Error("malformed: payload is not valid JSON");
  }
  return {
    payload,
    signature: b64urlDecode(sigB64),
    signedData: Buffer.from(payloadB64, "utf-8"),
  };
}
