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
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** du -sm wrapper — returns size in MB (integer). */
function dirSizeMb(p) {
  const r = spawnSync("du", ["-sm", p], { encoding: "utf-8" });
  return parseInt((r.stdout ?? "0").split("\t")[0], 10) || 0;
}

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

// node_modules : heavy (Puppeteer ~200 MB, Remotion ~600 MB, plus
// the frontend stack we don't need at runner time). We copy
// everything in `node_modules` then prune the frontend / dev /
// build-tool deps in a second pass — simpler than a complex filter,
// and the cpSync is mostly disk-bound so the post-trim is cheap
// next to the copy itself.
console.log("[desktop-prepare] staging node_modules (heavy, this takes a moment)…");
cpSync(src.node_modules, join(dst.runners, "node_modules"), {
  recursive: true,
  // Skip .cache (puppeteer browser cache lives elsewhere)
  filter: (path) => !path.includes("/.cache/"),
});

// Prune dependencies the runners (capture-tour, audio-tour,
// compose-tour, analyze-audio) never load. Pure frontend libs go
// (React UI + Next + framer / icons / fonts / Tauri JS SDK), plus
// dev + build-time tooling (TypeScript, ESLint, Prettier, Tailwind,
// Webpack/Rspack, SWC, sharp/img). Cuts the bundled .dmg by roughly
// 50%.
console.log("[desktop-prepare] pruning runner node_modules…");
const PRUNE_TOP_LEVEL = [
  // Next.js stack — the Next *server* lives in standalone/, runners
  // don't import any of this.
  "next", "@next",
  // Frontend UI / icons / animations / fonts / Tauri SDK
  "react-icons", "lucide-react", "framer-motion", "geist",
  "@tauri-apps",
  // Dev tooling : TypeScript / ESLint / Prettier
  "typescript", "@types",
  "eslint", "@eslint", "@typescript-eslint",
  "eslint-config-next", "eslint-plugin-react", "eslint-plugin-react-hooks",
  "prettier",
  // Build-time CSS / bundler / compiler
  "tailwindcss", "@tailwindcss",
  "webpack",
  "@rspack", "@rsbuild",
  "@swc",
  // sharp / lightningcss — frontend (Next/Image, Tailwind)
  "@img", "lightningcss-darwin-arm64", "lightningcss-darwin-x64",
  "lightningcss-linux-x64-gnu", "lightningcss-win32-x64-msvc",
];
let prunedMb = 0;
for (const name of PRUNE_TOP_LEVEL) {
  const target = join(dst.runners, "node_modules", name);
  if (existsSync(target)) {
    const sizeBefore = dirSizeMb(target);
    rmSync(target, { recursive: true, force: true });
    prunedMb += sizeBefore;
    console.log(`  - ${name} (${sizeBefore} MB)`);
  }
}
console.log(`[desktop-prepare] pruned ${Math.round(prunedMb)} MB total`);

// ─── frontendDist placeholder ──────────────────────────────────────
writeFileSync(
  join(dst.dist, "index.html"),
  "<!doctype html><meta http-equiv=refresh content=0;url=http://localhost:3030>",
);

// ─── codesign nested Mach-O binaries ───────────────────────────────
// Apple's notarization scanner recurses into Contents/Resources and
// rejects any unsigned Mach-O it finds. Tauri only signs the top-
// level executables it knows about (sidecars + main exe), so all the
// native node-modules binaries (esbuild, fsevents, @remotion/compositor,
// @unrs/resolver, etc.) come up as "not signed" or "missing secure
// timestamp" → notarization Invalid.
//
// We pre-sign every Mach-O inside the staged runners/ with hardened
// runtime + secure timestamp. Tauri's outer .app signing later just
// wraps everything. No entitlements on nested binaries — they inherit
// from the parent process at runtime (entitlements only meaningful
// on the main executable anyway).
const signingIdentity = process.env.APPLE_SIGNING_IDENTITY;
if (signingIdentity) {
  console.log(`[desktop-prepare] codesigning nested Mach-O binaries…`);
  // Both staged trees end up inside Contents/Resources/ so we have to
  // recurse-sign in both. We use `find -L` to follow symlinks (those
  // in node_modules/.bin/ resolve to real binaries) and probe every
  // candidate file via `file -b` for "Mach-O" — this catches custom
  // extensions like `.bare` (bare-url prebuilds), unflagged
  // executables, .dylibs, .nodes, .so, anything.
  const roots = [dst.runners, dst.standalone];
  const candidates = new Set();
  for (const root of roots) {
    // Fast cull : known native extensions + permission-executable
    // files. We exclude source/text files to keep the file-probe
    // cheap (file -b on 30k+ files would otherwise take ages).
    const fast = spawnSync(
      "find",
      [
        "-L", root,
        "-type", "f",
        "(",
        "-name", "*.dylib",
        "-o", "-name", "*.node",
        "-o", "-name", "*.so",
        "-o", "-name", "*.bare",
        "-o", "-perm", "+111",
        ")",
        "-not", "-name", "*.js",
        "-not", "-name", "*.mjs",
        "-not", "-name", "*.cjs",
        "-not", "-name", "*.json",
        "-not", "-name", "*.ts",
        "-not", "-name", "*.md",
        "-not", "-name", "*.map",
      ],
      { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
    );
    for (const f of (fast.stdout ?? "").split("\n").filter(Boolean)) {
      candidates.add(f);
    }
  }
  // file -b probe each candidate, keep only Mach-O.
  const files = [];
  for (const c of candidates) {
    const r = spawnSync("file", ["-b", c], { encoding: "utf-8" });
    if ((r.stdout ?? "").includes("Mach-O")) files.push(c);
  }
  console.log(`[desktop-prepare] signing ${files.length} Mach-O binaries…`);
  let ok = 0, fail = 0;
  for (const file of files) {
    const r = spawnSync(
      "codesign",
      [
        "--force",
        "--timestamp",
        "--options", "runtime",
        "--sign", signingIdentity,
        file,
      ],
      { stdio: ["ignore", "ignore", "pipe"], encoding: "utf-8" },
    );
    if (r.status === 0) {
      ok++;
    } else {
      fail++;
      console.error(`  ✗ ${file.replace(dst.runners, "runners")} — ${(r.stderr ?? "").trim().split("\n")[0]}`);
    }
  }
  console.log(`[desktop-prepare] codesigned ${ok} OK, ${fail} failed`);
} else {
  console.log(
    `[desktop-prepare] APPLE_SIGNING_IDENTITY not set — skipping nested codesign (unsigned .app, won't notarize)`,
  );
}

console.log(`[desktop-prepare] ✓ done`);
console.log(`  standalone : ${dst.standalone}`);
console.log(`  runners    : ${dst.runners}`);
console.log(`  dist       : ${dst.dist}`);
