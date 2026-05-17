#!/usr/bin/env node
/**
 * Issue une license webgen-motion signée Ed25519. Ben backoffice tool.
 * Sprint 9 — Davinci-style perpetual licensing.
 *
 * Usage :
 *   node scripts/issue-license.mjs \
 *     --email alice@example.com \
 *     --edition studio \
 *     --expires perpetual
 *
 *   node scripts/issue-license.mjs \
 *     --email bob@example.com \
 *     --edition enterprise \
 *     --expires 2027-12-31 \
 *     --features frames-3d,multi-format-export,music-library \
 *     --note "Promo earlyBird Q4 2026"
 *
 * Args :
 *   --email <s>     Identifiant licensee (email/UUID/etc.). Affiché dans
 *                   Settings de l'app cliente.
 *   --edition <s>   "studio" ou "enterprise". Détermine les flags
 *                   débloqués par défaut.
 *   --expires <s>   Date ISO ("2027-12-31"), unix ms, ou "perpetual"
 *                   pour ne jamais expirer. Default = "perpetual".
 *   --features <s>  CSV optionnel de feature flags à whitelist. Si omis,
 *                   l'edition débloque tous les flags qu'elle inclut.
 *   --note <s>      Note libre (campaign, raison).
 *   --output <s>    Path de sortie. Default = issued/<email>-<ts>.license.
 *   --key <s>       Path du private key PEM. Default = keys/license-private.pem
 *                   (prod). Pour tester : --key keys/dev-license-private.pem.
 *
 * Le script print le path du fichier généré + un résumé de la license.
 * Ben copie le .license et le donne au client (email attaché, lien
 * download privé, etc.). Le client l'installe via /setup/license dans
 * l'app ou drop dans ~/.webgen-motion/.license.
 */

import { createPrivateKey, sign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const email = arg("email");
const edition = arg("edition");
const expiresArg = arg("expires") ?? "perpetual";
const featuresArg = arg("features");
const note = arg("note");
const keyPath = resolve(arg("key") ?? join(REPO_ROOT, "keys/license-private.pem"));

if (!email || !edition) {
  console.error(`Usage : node scripts/issue-license.mjs --email <s> --edition <studio|enterprise> [--expires perpetual|ISO] [--features csv] [--note s] [--output path] [--key path]`);
  process.exit(2);
}
if (edition !== "studio" && edition !== "enterprise") {
  console.error(`✗ --edition doit être "studio" ou "enterprise" (reçu "${edition}")`);
  process.exit(2);
}
if (!existsSync(keyPath)) {
  console.error(`✗ Private key introuvable : ${keyPath}`);
  console.error(`  Générer la keypair une fois avec :`);
  console.error(`    node scripts/generate-license-keypair.mjs`);
  process.exit(2);
}

// Parse expires
let expiresAt = null;
if (expiresArg !== "perpetual") {
  const ms = Number.isFinite(Number(expiresArg))
    ? Number(expiresArg)
    : new Date(expiresArg).getTime();
  if (!Number.isFinite(ms)) {
    console.error(`✗ --expires doit être "perpetual", ISO date ou unix ms (reçu "${expiresArg}")`);
    process.exit(2);
  }
  expiresAt = ms;
}

// Build payload (matches src/lib/license/types.ts LicensePayload)
const payload = {
  v: 1,
  email,
  edition,
  issuedAt: Date.now(),
  expiresAt,
};
if (featuresArg) {
  payload.features = featuresArg.split(",").map((s) => s.trim()).filter(Boolean);
}
if (note) {
  payload.note = note;
}

// base64url helpers (matches src/lib/license/serialize.ts)
function b64urlEncode(input) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const payloadJson = JSON.stringify(payload);
const payloadB64 = b64urlEncode(payloadJson);
const signedData = Buffer.from(payloadB64, "utf-8");

const privateKey = createPrivateKey({ key: readFileSync(keyPath), format: "pem", type: "pkcs8" });
const signature = sign(null, signedData, privateKey); // Ed25519 : algo = null
const sigB64 = b64urlEncode(signature);

const fileContent =
  `-----BEGIN WEBGEN-MOTION LICENSE v1-----\n` +
  `${payloadB64}.${sigB64}\n` +
  `-----END WEBGEN-MOTION LICENSE-----\n`;

// Output path
const safeName = email.replace(/[^a-zA-Z0-9._-]/g, "_");
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
const outputDefault = join(REPO_ROOT, "issued", `${safeName}-${ts}.license`);
const outputPath = resolve(arg("output") ?? outputDefault);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, fileContent);

const expiresStr = expiresAt === null
  ? "perpetual"
  : new Date(expiresAt).toISOString();
console.log(`✓ License émise :`);
console.log(``);
console.log(`  email      : ${email}`);
console.log(`  edition    : ${edition}`);
console.log(`  expires    : ${expiresStr}`);
console.log(`  features   : ${payload.features?.join(", ") ?? "(all flags of edition)"}`);
console.log(`  note       : ${payload.note ?? "(none)"}`);
console.log(`  output     : ${outputPath}`);
console.log(``);
console.log(`Donne ce fichier au client. Il l'installe via /setup/license dans`);
console.log(`l'app, ou drop directement dans ~/.webgen-motion/.license.`);
