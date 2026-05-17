#!/usr/bin/env node
/**
 * Notarize + staple pipeline pour le .dmg macOS de webgen-motion.
 *
 * Workflow :
 *   1. Source .env.local pour APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID
 *   2. Export APPLE_SIGNING_IDENTITY depuis tauri.conf.json (si pas déjà set)
 *   3. `npm run tauri:build` (skippé avec --skip-build)
 *   4. Trouve le dernier .dmg dans target/release/bundle/dmg/
 *   5. Submit Apple Notary Service (xcrun notarytool submit --wait)
 *   6. Si Accepted → staple ticket sur .dmg + .app
 *   7. Vérifie avec stapler validate + spctl --assess
 *   8. Si Invalid → fetch log, print issues, exit 1
 *
 * Usage :
 *   node scripts/notarize-and-staple.mjs              # build + submit + staple
 *   node scripts/notarize-and-staple.mjs --skip-build # juste submit + staple
 *   node scripts/notarize-and-staple.mjs --dmg <path> # submit un .dmg spécifique
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUNDLE_DMG_DIR = join(REPO_ROOT, "src-tauri/target/release/bundle/dmg");
const BUNDLE_APP_DIR = join(REPO_ROOT, "src-tauri/target/release/bundle/macos");
const ENV_LOCAL = join(REPO_ROOT, ".env.local");
const TAURI_CONF = join(REPO_ROOT, "src-tauri/tauri.conf.json");

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const dmgFlag = args.indexOf("--dmg");
const dmgOverride = dmgFlag >= 0 ? args[dmgFlag + 1] : null;

function log(msg) {
  console.log(`[notarize] ${msg}`);
}
function fail(msg) {
  console.error(`[notarize] ✗ ${msg}`);
  process.exit(1);
}

// ─── 1. load .env.local ────────────────────────────────────────────
if (!existsSync(ENV_LOCAL)) {
  fail(`.env.local introuvable à ${ENV_LOCAL}`);
}
const envContent = readFileSync(ENV_LOCAL, "utf-8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (!m) continue;
  const [, k, v] = m;
  if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, "");
}

const APPLE_ID = process.env.APPLE_ID;
const APPLE_PASSWORD = process.env.APPLE_PASSWORD;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
if (!APPLE_ID || !APPLE_PASSWORD || !APPLE_TEAM_ID) {
  fail(
    "APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID requis dans .env.local. " +
      "APPLE_PASSWORD doit être un app-specific password (https://appleid.apple.com/).",
  );
}
log(`Apple ID: ${APPLE_ID}  ·  Team: ${APPLE_TEAM_ID}`);

// ─── 2. signing identity depuis tauri.conf.json ─────────────────────
if (!process.env.APPLE_SIGNING_IDENTITY) {
  try {
    const conf = JSON.parse(readFileSync(TAURI_CONF, "utf-8"));
    const id = conf?.bundle?.macOS?.signingIdentity;
    if (id) {
      process.env.APPLE_SIGNING_IDENTITY = id;
      log(`signing identity (depuis tauri.conf) : ${id}`);
    }
  } catch (e) {
    log(`⚠ tauri.conf.json illisible : ${e.message}`);
  }
}
if (!process.env.APPLE_SIGNING_IDENTITY) {
  fail(
    "APPLE_SIGNING_IDENTITY absent — set en env ou dans tauri.conf.json bundle.macOS.signingIdentity",
  );
}

// ─── 3. build (sauf --skip-build) ──────────────────────────────────
if (!skipBuild) {
  log(`npm run tauri:build (5-15 min)…`);
  const build = spawnSync("npm", ["run", "tauri:build"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (build.status !== 0) {
    fail(`tauri:build a échoué (exit ${build.status})`);
  }
  log(`✓ build terminé`);
} else {
  log(`--skip-build : utilise le .dmg existant`);
}

// ─── 4. trouve le .dmg ─────────────────────────────────────────────
let dmgPath = dmgOverride;
if (!dmgPath) {
  if (!existsSync(BUNDLE_DMG_DIR)) {
    fail(`bundle/dmg/ introuvable — build a peut-être échoué silencieusement`);
  }
  const dmgs = readdirSync(BUNDLE_DMG_DIR)
    .filter((f) => f.endsWith(".dmg") && !f.startsWith("rw."))
    .map((f) => ({
      name: f,
      path: join(BUNDLE_DMG_DIR, f),
      mtime: statSync(join(BUNDLE_DMG_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!dmgs.length) {
    fail(`aucun .dmg trouvé dans ${BUNDLE_DMG_DIR}`);
  }
  dmgPath = dmgs[0].path;
}
const dmgSize = statSync(dmgPath).size;
const dmgMb = Math.round(dmgSize / (1024 * 1024));
log(`.dmg : ${basename(dmgPath)} (${dmgMb} MB)`);
if (dmgMb > 400) {
  log(`⚠ .dmg fait ${dmgMb} MB — cible post-Stage 5 prune est ~300 MB. Le prune a peut-être pas tourné.`);
}

// ─── 5. submit ─────────────────────────────────────────────────────
log(`xcrun notarytool submit --wait (5-60 min)…`);
const submitArgs = [
  "notarytool",
  "submit",
  dmgPath,
  "--apple-id",
  APPLE_ID,
  "--team-id",
  APPLE_TEAM_ID,
  "--password",
  APPLE_PASSWORD,
  "--wait",
  "--output-format",
  "json",
];
const submit = spawnSync("xcrun", submitArgs, {
  encoding: "utf-8",
  maxBuffer: 16 * 1024 * 1024,
});
const submitOut = (submit.stdout ?? "") + (submit.stderr ?? "");
let submitInfo;
try {
  submitInfo = JSON.parse(submit.stdout);
} catch {
  fail(`Parsing JSON output notarytool a échoué.\n${submitOut}`);
}
const subId = submitInfo.id;
const status = submitInfo.status;
log(`submission id : ${subId}`);
log(`status : ${status}`);

// ─── 6. fetch log si pas Accepted ──────────────────────────────────
if (status !== "Accepted") {
  log(`✗ Status = ${status} — fetch log pour diagnostic…`);
  const logRes = spawnSync(
    "xcrun",
    [
      "notarytool",
      "log",
      subId,
      "--apple-id",
      APPLE_ID,
      "--team-id",
      APPLE_TEAM_ID,
      "--password",
      APPLE_PASSWORD,
    ],
    { encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 },
  );
  console.error(logRes.stdout || logRes.stderr);
  fail(
    `Notarization ${status}. Lire les issues ci-dessus, fixer (souvent : un binary manqué par le nested codesign), rebuild, re-submit.`,
  );
}

// ─── 7. staple ─────────────────────────────────────────────────────
log(`Accepted ✓ — stapler staple le .dmg + .app…`);

const stapleDmg = spawnSync("xcrun", ["stapler", "staple", dmgPath], {
  stdio: "inherit",
});
if (stapleDmg.status !== 0) {
  fail(`stapler staple <dmg> a échoué`);
}

// .app dans bundle/macos/
let appPath = null;
if (existsSync(BUNDLE_APP_DIR)) {
  const apps = readdirSync(BUNDLE_APP_DIR)
    .filter((f) => f.endsWith(".app"))
    .map((f) => join(BUNDLE_APP_DIR, f));
  if (apps.length) {
    appPath = apps[0];
    log(`.app : ${basename(appPath)}`);
    const stapleApp = spawnSync("xcrun", ["stapler", "staple", appPath], {
      stdio: "inherit",
    });
    if (stapleApp.status !== 0) {
      fail(`stapler staple <app> a échoué`);
    }
  }
}

// ─── 8. verify ─────────────────────────────────────────────────────
log(`vérification finale…`);
const validateDmg = spawnSync("xcrun", ["stapler", "validate", dmgPath], {
  encoding: "utf-8",
});
console.log(validateDmg.stdout || validateDmg.stderr);
if (appPath) {
  const spctl = spawnSync(
    "spctl",
    ["--assess", "--type", "execute", "--verbose=4", appPath],
    { encoding: "utf-8" },
  );
  // spctl --assess prints to stderr ; non-zero is OK pour notre check
  console.log(spctl.stdout || spctl.stderr);
}

log(``);
log(`✓ ✓ ✓ Notarization complete`);
log(`.dmg : ${dmgPath}  (${dmgMb} MB, signed + notarized + stapled)`);
if (appPath) {
  log(`.app : ${appPath}`);
}
log(``);
log(`Prochaine étape : tag v0.2.0 + push pour déclencher desktop-release.yml CI multi-OS.`);
