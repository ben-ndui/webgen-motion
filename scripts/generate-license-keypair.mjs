#!/usr/bin/env node
/**
 * Génère une paire de clés Ed25519 pour signer les licenses
 * webgen-motion. À exécuter UNE FOIS pour générer la prod keypair
 * de Ben, puis garder le private.pem OFFLINE et SECRET.
 *
 * Usage :
 *   node scripts/generate-license-keypair.mjs                     # prod, output keys/
 *   node scripts/generate-license-keypair.mjs --prefix dev-       # dev, output keys/dev-*
 *   node scripts/generate-license-keypair.mjs --output /path/...  # output dir custom
 *
 * Outputs (dans <output>/ ou ./keys/) :
 *   <prefix>license-private.pem      PKCS8, GARDER SECRET (gitignored)
 *   <prefix>license-public.pem       SPKI, peut être commit
 *   <prefix>license-public-base64.txt   base64 (raw 32 bytes) pour embed
 *                                       dans src/lib/license/public-key.ts
 *
 * Workflow Ben (prod) :
 *   1. node scripts/generate-license-keypair.mjs
 *   2. Copier le contenu de keys/license-public-base64.txt
 *   3. Le coller comme constant LICENSE_PUBLIC_KEY_B64 dans
 *      src/lib/license/public-key.ts (puis commit)
 *   4. Stocker keys/license-private.pem dans un coffre offline
 *      (1Password, USB chiffré, etc.). NE JAMAIS commit.
 *   5. Utiliser scripts/issue-license.mjs pour créer des licenses
 *      signées avec ce private key.
 */

import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const args = process.argv.slice(2);
const prefixIdx = args.indexOf("--prefix");
const outIdx = args.indexOf("--output");
const prefix = prefixIdx >= 0 ? args[prefixIdx + 1] : "";
const outputDir = resolve(
  outIdx >= 0 ? args[outIdx + 1] : join(REPO_ROOT, "keys"),
);

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
  console.log(`[gen-keys] créé ${outputDir}/`);
}

const privPath = join(outputDir, `${prefix}license-private.pem`);
const pubPath = join(outputDir, `${prefix}license-public.pem`);
const pubB64Path = join(outputDir, `${prefix}license-public-base64.txt`);

if (existsSync(privPath)) {
  console.error(`✗ ${privPath} existe déjà — refus d'écraser.`);
  console.error(`  Si tu veux régénérer, supprime le fichier manuellement`);
  console.error(`  (ATTENTION : toutes les licenses signées avec l'ancien`);
  console.error(`  private key deviendront invalides).`);
  process.exit(1);
}

console.log(`[gen-keys] génération Ed25519 keypair…`);
const { publicKey, privateKey } = generateKeyPairSync("ed25519");

// PKCS8 PEM pour le private key
const privPem = privateKey.export({ format: "pem", type: "pkcs8" });
writeFileSync(privPath, privPem, { mode: 0o600 });
console.log(`[gen-keys] ✓ ${privPath} (mode 0600, KEEP SECRET)`);

// SPKI PEM pour le public key (commit-friendly)
const pubPem = publicKey.export({ format: "pem", type: "spki" });
writeFileSync(pubPath, pubPem);
console.log(`[gen-keys] ✓ ${pubPath}`);

// Raw 32 bytes en base64 pour embed dans src/lib/license/public-key.ts.
// Ed25519 SPKI = DER prefix 12 bytes + 32 bytes raw key. On extrait via
// JWK puis on encode en base64.
const jwk = publicKey.export({ format: "jwk" });
// jwk.x est base64url. On convertit en base64 standard.
const xBase64Url = jwk.x;
const xBase64 = xBase64Url.replace(/-/g, "+").replace(/_/g, "/");
const padded = xBase64 + "=".repeat((4 - (xBase64.length % 4)) % 4);
writeFileSync(pubB64Path, padded + "\n");
console.log(`[gen-keys] ✓ ${pubB64Path}`);

console.log(``);
console.log(`Public key (base64, 32 bytes raw) à embed :`);
console.log(``);
console.log(`  ${padded}`);
console.log(``);
console.log(`Prochaine étape :`);
console.log(`  1. Copier la base64 ci-dessus`);
console.log(`  2. La coller comme LICENSE_PUBLIC_KEY_B64 dans`);
console.log(`     src/lib/license/public-key.ts`);
console.log(`  3. Garder ${privPath} OFFLINE (jamais commit)`);
console.log(``);
