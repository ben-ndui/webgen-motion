#!/usr/bin/env -S npx tsx
/**
 * Émet une licence webgen-motion signée Ed25519. Outil backoffice
 * (émission manuelle / réémission). Le fulfillment Stripe automatique
 * passe lui aussi par le même cœur (`src/lib/license/issue.ts`) — une
 * seule source de vérité pour la signature.
 *
 * Usage :
 *   npx tsx scripts/issue-license.ts \
 *     --email alice@example.com --edition studio --expires perpetual
 *
 *   npx tsx scripts/issue-license.ts \
 *     --email bob@example.com --edition enterprise --expires 2027-12-31 \
 *     --features frames-3d,multi-format-export --note "Promo Q4 2026"
 *
 * Args : --email, --edition <studio|enterprise>, --expires <perpetual|ISO|ms>,
 *        --features <csv>, --note <s>, --output <path>, --key <pem path>.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { issueLicense, type IssuableEdition } from "../src/lib/license/issue";
import type { FeatureFlag } from "../src/lib/edition";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const email = arg("email");
const edition = arg("edition") as IssuableEdition | undefined;
const expiresArg = arg("expires") ?? "perpetual";
const featuresArg = arg("features");
const note = arg("note");
const keyPath = resolve(arg("key") ?? join(REPO_ROOT, "keys/license-private.pem"));

if (!email || !edition) {
  console.error(
    `Usage : npx tsx scripts/issue-license.ts --email <s> --edition <studio|enterprise> [--expires perpetual|ISO] [--features csv] [--note s] [--output path] [--key path]`,
  );
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

let expiresAt: number | null = null;
if (expiresArg !== "perpetual") {
  const ms = Number.isFinite(Number(expiresArg))
    ? Number(expiresArg)
    : new Date(expiresArg).getTime();
  if (!Number.isFinite(ms)) {
    console.error(
      `✗ --expires doit être "perpetual", ISO date ou unix ms (reçu "${expiresArg}")`,
    );
    process.exit(2);
  }
  expiresAt = ms;
}

const features = featuresArg
  ? (featuresArg.split(",").map((s) => s.trim()).filter(Boolean) as FeatureFlag[])
  : undefined;

const { content, payload } = issueLicense(
  { email, edition, expiresAt, features, note },
  readFileSync(keyPath),
);

const safeName = email.replace(/[^a-zA-Z0-9._-]/g, "_");
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
const outputDefault = join(REPO_ROOT, "issued", `${safeName}-${ts}.license`);
const outputPath = resolve(arg("output") ?? outputDefault);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content);

const expiresStr = expiresAt === null ? "perpetual" : new Date(expiresAt).toISOString();
console.log(`✓ License émise :\n`);
console.log(`  email      : ${email}`);
console.log(`  edition    : ${edition}`);
console.log(`  expires    : ${expiresStr}`);
console.log(`  features   : ${payload.features?.join(", ") ?? "(all flags of edition)"}`);
console.log(`  note       : ${payload.note ?? "(none)"}`);
console.log(`  output     : ${outputPath}\n`);
console.log(`Donne ce fichier au client (ou laisse le fulfillment Stripe l'envoyer).`);
