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
      // Les fiches de film sont des DONNÉES de la personne (clients compris) :
      // jamais embarquées dans l'app. L'app installée les lit dans
      // ~/.webgen-motion/fiches (film-loader.ts).
      "films/**/*",
      // Idem pour les projets de format (src/lib/formats/format-store.ts).
      "formats/**/*",
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
    // pdf-parse embarque pdf.js, qui va chercher son worker à un chemin
    // relatif (pdf.worker.mjs) : bundlé dans un chunk serveur, ce fichier
    // n'existe plus à côté, et toute lecture de PDF échoue en prod/standalone.
    // Externalisé, require() le résout depuis node_modules tel quel.
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    // mammoth (docx) n'a pas de chemin dynamique comme pdf.js, mais le
    // traceur l'omettait quand même du standalone : même traitement.
    "mammoth",
  ],
  // Externaliser ne suffit pas : le worker (pdf.worker.mjs) est chargé par un
  // chemin construit à l'exécution, que le traceur de fichiers ne détecte
  // pas statiquement — sans ce forçage, le build standalone l'omet et toute
  // lecture de PDF échoue (« Cannot find module ... pdf.worker.mjs »).
  // `@napi-rs/canvas` publie son binaire natif dans un paquet FRÈRE par
  // architecture (`@napi-rs/canvas-darwin-arm64`, pas sous `canvas/`) : un
  // glob trop étroit sur `canvas/**` le manque, et pdf.js plante alors au
  // chargement (« DOMMatrix is not defined ») — testé une fois dans le repo
  // (faux vert : retombe sur le vrai node_modules du projet) puis une
  // seconde fois sur une copie isolée de .next/standalone, comme le fait
  // réellement l'app empaquetée par Tauri.
  outputFileTracingIncludes: {
    "*": ["node_modules/pdfjs-dist/**/*", "node_modules/pdf-parse/**/*", "node_modules/@napi-rs/**/*", "node_modules/mammoth/**/*"],
  },
  // Next coupe silencieusement tout corps de requête /api/motion/** à 10 Mo
  // par défaut (middleware.ts) : ça cassait déjà l'upload de modèles 3D
  // (models/upload annonce 50 Mo dans son propre code, jamais atteignable).
  // Sans risque d'exposition publique : ces routes sont refusées en bloc sur
  // le déploiement web (desktop-guard.ts, raison "public-web"), donc ce
  // plafond ne protège que le serveur local de la personne contre elle-même.
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
