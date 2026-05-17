import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// Pin the file-tracing root to THIS directory. Without this, Next
// detects a sibling lockfile in `$HOME/` and walks up the file system
// looking for "dependencies", producing a 2 GB standalone bundle
// full of unrelated files. Pinning here keeps it scoped to the
// repo (~100 MB instead of ~2.4 GB).
const repoRoot = dirname(fileURLToPath(import.meta.url));

// Inject la version courante depuis package.json au build pour que
// le client (UpdateChecker) puisse comparer à la latest release
// GitHub via genmotion.app/api/version. Build-time constant, donc
// le rebuild Vercel / Tauri auto-update à chaque bump version.
const pkg = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf-8"),
) as { version: string };

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Exclude heavy runtime-only deps from the Next.js trace : the
  // routes spawn `tsx scripts/<runner>.ts` as a child process, they
  // never IMPORT puppeteer / remotion / ffmpeg / nodejs-whisper /
  // their Chromium binary. Tracing pulls them in (700+ MB) for no
  // reason — Tauri bundles the scripts + their node_modules
  // separately as Resources.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/puppeteer/**/*",
      "node_modules/puppeteer-core/**/*",
      "node_modules/@puppeteer/**/*",
      "node_modules/.cache/puppeteer/**/*",
      "node_modules/remotion/**/*",
      "node_modules/@remotion/**/*",
      "node_modules/.bin/**/*",
      "node_modules/typescript/**/*",
      "node_modules/@types/**/*",
      "out/**/*",
      "src-tauri/target/**/*",
      "src-tauri/standalone/**/*",
      "tests/**/*",
      "scripts/**/*",
    ],
  },
  // These packages are referenced via API routes but should NEVER
  // be inlined into the Next server bundle — keep them as plain
  // `require()` resolved at runtime against node_modules.
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@puppeteer/browsers",
    "remotion",
    "@remotion/cli",
    "@remotion/bundler",
    "@remotion/renderer",
  ],
};

export default nextConfig;
