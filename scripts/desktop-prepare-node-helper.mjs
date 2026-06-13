#!/usr/bin/env node
/**
 * Tauri pre-bundle step — emballe le binaire Node dans un mini bundle
 * `.app` « agent » (LSUIElement) pour qu'il NE crée PAS de tuile Dock /
 * d'entrée Cmd-Tab séparée quand le shell le lance comme serveur.
 *
 * Pourquoi : le binaire Node officiel est lié à CoreFoundation. Lancé
 * tel quel comme process persistant dans une session GUI macOS,
 * LaunchServices le traite comme une app GUI standard → une 2ᵉ icône
 * « node » apparaît dans le Dock et le Cmd-Tab, que l'utilisateur doit
 * fermer à part. Un binaire posé dans `Contents/MacOS/` du bundle
 * principal hérite de l'app GUI principale (sans LSUIElement) → tuile.
 *
 * Fix : déplacer Node DANS son propre bundle dont l'Info.plist porte
 * `LSUIElement=1`. Quand on exec directement l'exécutable contenu dans
 * un `.app`, LaunchServices l'associe à CE bundle et honore LSUIElement
 * → process accessoire, aucune tuile. (Même mécanisme que les "Helper"
 * d'Electron / Chrome.)
 *
 * Layout produit :
 *   src-tauri/node-helper/WebgenMotionNode.app/
 *     Contents/
 *       Info.plist                ← LSUIElement=1
 *       MacOS/node                ← copie du binaire node-<triple>
 *
 * Embarqué via la glob `node-helper` de `tauri.conf.json > bundle.resources`,
 * recopié dans Contents/Resources/node-helper/ au bundling, puis lancé
 * par le shell Rust (cf. src-tauri/src/lib.rs) via le chemin Resource.
 *
 * Signature : on signe le bundle helper ICI (inside-out, hardened
 * runtime + entitlements), AVANT que Tauri signe l'app externe. C'est
 * le même contrat que desktop-prepare-standalone.mjs pour les Mach-O
 * imbriqués : Tauri emballe par-dessus sans recasser la signature
 * interne, et le scanner de notarisation la trouve valide.
 *
 * Run automatiquement par `tauri build` via `beforeBuildCommand`.
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { arch } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const binariesDir = join(repoRoot, "src-tauri", "binaries");
const helperRoot = join(repoRoot, "src-tauri", "node-helper");
const APP_NAME = "WebgenMotionNode.app";
const appDir = join(helperRoot, APP_NAME);

const BUNDLE_ID = "fr.smoothandesign.webgen-motion.NodeHelper";
const ENTITLEMENTS = join(repoRoot, "src-tauri", "entitlements.plist");

function log(msg) {
  console.log(`[node-helper] ${msg}`);
}
function fail(msg) {
  console.error(`[node-helper] ✗ ${msg}`);
  process.exit(1);
}

// ─── 1. résoudre le binaire node-<triple> à embarquer ──────────────
// Par défaut on prend le triple de l'hôte (Tauri build vise l'hôte) ;
// `--target <triple>` override pour les builds croisés. Fallback : le
// seul node-*-apple-darwin présent.
const targetFlag = process.argv.indexOf("--target");
const targetTriple = targetFlag >= 0 ? process.argv[targetFlag + 1] : null;
const hostTriple = arch() === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
const wantedTriple = targetTriple ?? hostTriple;

let nodeBin = join(binariesDir, `node-${wantedTriple}`);
if (!existsSync(nodeBin)) {
  const found = readdirSync(binariesDir).filter(
    (f) => f.startsWith("node-") && f.endsWith("-apple-darwin"),
  );
  if (found.length === 0) {
    fail(
      `aucun binaire node-*-apple-darwin dans ${binariesDir} — lance d'abord ` +
        `scripts/desktop-fetch-binaries.mjs`,
    );
  }
  log(`node-${wantedTriple} absent → fallback sur ${found[0]}`);
  nodeBin = join(binariesDir, found[0]);
}

// ─── 2. (re)construire le bundle helper ────────────────────────────
rmSync(helperRoot, { recursive: true, force: true });
const macosDir = join(appDir, "Contents", "MacOS");
mkdirSync(macosDir, { recursive: true });

const destNode = join(macosDir, "node");
cpSync(nodeBin, destNode);
chmodSync(destNode, 0o755);

// Info.plist minimal — LSUIElement=1 est la clé qui supprime la tuile.
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleExecutable</key>
	<string>node</string>
	<key>CFBundleIdentifier</key>
	<string>${BUNDLE_ID}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>WebgenMotionNode</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSMinimumSystemVersion</key>
	<string>10.15</string>
	<!-- Process accessoire : pas de tuile Dock ni d'entrée Cmd-Tab. -->
	<key>LSUIElement</key>
	<true/>
	<!-- Pas de fenêtre / pas d'UI : c'est un serveur Node headless. -->
	<key>LSBackgroundOnly</key>
	<true/>
</dict>
</plist>
`;
writeFileSync(join(appDir, "Contents", "Info.plist"), infoPlist);
log(`bundle créé : ${appDir} (node = ${wantedTriple})`);

// ─── 3. signer le bundle helper (inside-out) ───────────────────────
// Mêmes entitlements que l'app principale : Node/V8 ont besoin de JIT
// + disable-library-validation (cf. commentaires entitlements.plist),
// sinon le helper meurt au boot dans une app notarisée.
const signingIdentity = process.env.APPLE_SIGNING_IDENTITY;
if (signingIdentity) {
  const r = spawnSync(
    "codesign",
    [
      "--force",
      "--timestamp",
      "--options", "runtime",
      "--entitlements", ENTITLEMENTS,
      "--sign", signingIdentity,
      appDir,
    ],
    { stdio: ["ignore", "ignore", "pipe"], encoding: "utf-8" },
  );
  if (r.status !== 0) {
    fail(`codesign helper : ${(r.stderr ?? "").trim().split("\n")[0]}`);
  }
  log(`✓ helper signé (${signingIdentity})`);
} else {
  log(
    "APPLE_SIGNING_IDENTITY absent — helper non signé (OK en dev, " +
      "ne notarisera pas en release)",
  );
}

log("✓ done");
