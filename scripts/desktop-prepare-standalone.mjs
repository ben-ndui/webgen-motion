#!/usr/bin/env node
/**
 * Tauri pre-bundle step. Runs after `next build` and assembles
 * the standalone Next.js server + static assets at the shape
 * the Rust sidecar expects to find in the final bundle's
 * Resources directory.
 *
 * What it does :
 *   - Copies `.next/standalone/` (server.js + node_modules trimmed
 *     to what's actually imported) → `src-tauri/standalone/`
 *   - Copies `.next/static/` → `src-tauri/standalone/.next/static/`
 *     (Next standalone expects static assets at this path)
 *   - Copies `public/` → `src-tauri/standalone/public/`
 *     (so `/demo.mp4` and other static files keep resolving)
 *   - Writes a one-pixel `src-tauri/dist/index.html` so Tauri's
 *     build step finds *something* at frontendDist — the window
 *     will navigate to localhost:3030 instead, this file is never
 *     actually loaded
 *
 * Run automatically by `tauri build` via `beforeBuildCommand`.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcStandalone = join(repoRoot, ".next", "standalone");
const srcStatic = join(repoRoot, ".next", "static");
const srcPublic = join(repoRoot, "public");
const dstStandalone = join(repoRoot, "src-tauri", "standalone");
const dstDist = join(repoRoot, "src-tauri", "dist");

if (!existsSync(srcStandalone)) {
  console.error(
    `[desktop-prepare] .next/standalone is missing — did you run \`next build\` with \`output: "standalone"\` ?`,
  );
  process.exit(1);
}

// Reset destination dirs each time so we don't carry stale files.
rmSync(dstStandalone, { recursive: true, force: true });
rmSync(dstDist, { recursive: true, force: true });
mkdirSync(dstStandalone, { recursive: true });
mkdirSync(dstDist, { recursive: true });

// 1. Server bundle + trimmed node_modules.
cpSync(srcStandalone, dstStandalone, { recursive: true });

// 2. .next/static — Next standalone resolves these from a sibling
//    `.next/static/...` relative to server.js.
if (existsSync(srcStatic)) {
  cpSync(srcStatic, join(dstStandalone, ".next", "static"), {
    recursive: true,
  });
}

// 3. public/ — same path semantics as a regular Next deployment.
if (existsSync(srcPublic)) {
  cpSync(srcPublic, join(dstStandalone, "public"), { recursive: true });
}

// 4. Placeholder frontendDist so Tauri build accepts it.
writeFileSync(
  join(dstDist, "index.html"),
  "<!doctype html><meta http-equiv=refresh content=0;url=http://localhost:3030>",
);

console.log(
  `[desktop-prepare] ✓ standalone staged → ${dstStandalone}`,
);
