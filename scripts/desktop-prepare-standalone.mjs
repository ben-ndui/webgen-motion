#!/usr/bin/env node
/**
 * Tauri pre-bundle step. Runs after `next build` and assembles
 * the standalone Next.js server + scripts/ + their runtime
 * node_modules at the shape the Rust sidecar expects to find in
 * the final bundle's Resources directory.
 *
 * Layout produced :
 *   src-tauri/
 *     standalone/                  ← Next standalone server bundle
 *       server.js
 *       .next/static/...
 *       public/...
 *       node_modules/ (trimmed)
 *     runners/                      ← Spawned by API routes
 *       scripts/<*.ts>
 *       remotion/...
 *       src/...                     ← Lib code the scripts import
 *       categories.json
 *       tours/                      ← Tour catalogue (so audio-tour
 *                                     can read tour.bgMusic, etc.)
 *       package.json
 *       node_modules/               ← FULL node_modules (puppeteer,
 *                                     remotion, tsx, etc.) — heavy
 *                                     but unavoidable until stage 4
 *                                     bundles each binary explicitly
 *     dist/index.html               ← Placeholder for frontendDist
 *
 * Run automatically by `tauri build` via `beforeBuildCommand`.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const dst = {
  standalone: join(repoRoot, "src-tauri", "standalone"),
  runners: join(repoRoot, "src-tauri", "runners"),
  dist: join(repoRoot, "src-tauri", "dist"),
};

const src = {
  standalone: join(repoRoot, ".next", "standalone"),
  next_static: join(repoRoot, ".next", "static"),
  public: join(repoRoot, "public"),
  scripts: join(repoRoot, "scripts"),
  remotion: join(repoRoot, "remotion"),
  lib: join(repoRoot, "src", "lib"),
  tours: join(repoRoot, "tours"),
  categories_json: join(repoRoot, "categories.json"),
  remotion_config: join(repoRoot, "remotion.config.ts"),
  tsconfig: join(repoRoot, "tsconfig.json"),
  package_json: join(repoRoot, "package.json"),
  node_modules: join(repoRoot, "node_modules"),
};

if (!existsSync(src.standalone)) {
  console.error(
    `[desktop-prepare] .next/standalone is missing — did you run \`next build\` with \`output: "standalone"\` ?`,
  );
  process.exit(1);
}

// Wipe + recreate
for (const d of Object.values(dst)) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

// ─── standalone ────────────────────────────────────────────────────
console.log("[desktop-prepare] staging standalone…");
cpSync(src.standalone, dst.standalone, { recursive: true });
if (existsSync(src.next_static)) {
  cpSync(src.next_static, join(dst.standalone, ".next", "static"), {
    recursive: true,
  });
}
if (existsSync(src.public)) {
  cpSync(src.public, join(dst.standalone, "public"), { recursive: true });
}

// ─── runners (scripts + their deps) ────────────────────────────────
console.log("[desktop-prepare] staging runners…");
cpSync(src.scripts, join(dst.runners, "scripts"), { recursive: true });
cpSync(src.remotion, join(dst.runners, "remotion"), { recursive: true });
cpSync(src.lib, join(dst.runners, "src", "lib"), { recursive: true });
if (existsSync(src.tours)) {
  cpSync(src.tours, join(dst.runners, "tours"), { recursive: true });
}
if (existsSync(src.categories_json)) {
  cpSync(src.categories_json, join(dst.runners, "categories.json"));
}
if (existsSync(src.remotion_config)) {
  cpSync(src.remotion_config, join(dst.runners, "remotion.config.ts"));
}
if (existsSync(src.tsconfig)) {
  cpSync(src.tsconfig, join(dst.runners, "tsconfig.json"));
}
cpSync(src.package_json, join(dst.runners, "package.json"));

// node_modules : heavy (Puppeteer with bundled Chromium ~200 MB,
// Remotion ~600 MB, dev deps not needed). For stage 3 we copy the
// full tree to guarantee the runners boot ; stage 4 will prune.
console.log("[desktop-prepare] staging node_modules (heavy, this takes a moment)…");
cpSync(src.node_modules, join(dst.runners, "node_modules"), {
  recursive: true,
  // Skip .cache (puppeteer browser cache lives elsewhere)
  filter: (path) => !path.includes("/.cache/"),
});

// ─── frontendDist placeholder ──────────────────────────────────────
writeFileSync(
  join(dst.dist, "index.html"),
  "<!doctype html><meta http-equiv=refresh content=0;url=http://localhost:3030>",
);

console.log(`[desktop-prepare] ✓ done`);
console.log(`  standalone : ${dst.standalone}`);
console.log(`  runners    : ${dst.runners}`);
console.log(`  dist       : ${dst.dist}`);
