// Élagage des node_modules embarqués avec les runners de l'app de bureau :
// tout ce qu'ils ne chargent jamais repart (pile web, outils de dev, binaires
// des autres systèmes). Extrait de desktop-prepare-standalone.mjs le 18/10/2026.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

/** du -sm wrapper — returns size in MB (integer). */
function dirSizeMb(p) {
  const r = spawnSync("du", ["-sm", p], { encoding: "utf-8" });
  return parseInt((r.stdout ?? "0").split("\t")[0], 10) || 0;
}

export function elaguerLesModulesDesRunners(modules) {
  console.log("[desktop-prepare] pruning runner node_modules…");
  // Prune dependencies the runners (capture-tour, audio-tour,
  // compose-tour, analyze-audio) never load. Pure frontend libs go
  // (React UI + Next + framer / icons / fonts / Tauri JS SDK), plus
  // dev + build-time tooling (TypeScript, ESLint, Prettier, Tailwind,
  // Webpack/Rspack, SWC, sharp/img). Cuts the bundled .dmg by roughly
  // 50%.
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
    // Stripe (checkout web) et PostHog (tracking web — JAMAIS dans
    // l'app desktop, cf. SMOOTH_MANIFEST) : routes API Next, pas de
    // runner ne les importe.
    "stripe", "@posthog", "posthog-js", "posthog-node",
  ];
  let prunedMb = 0;
  for (const name of PRUNE_TOP_LEVEL) {
    const target = join(modules, name);
    if (existsSync(target)) {
      const sizeBefore = dirSizeMb(target);
      rmSync(target, { recursive: true, force: true });
      prunedMb += sizeBefore;
      console.log(`  - ${name} (${sizeBefore} MB)`);
    }
  }
  // onnxruntime-node (alignement des paroles du karaoké) livre ses binaires pour
  // trois systèmes et deux processeurs : on ne garde que ceux de la machine qui
  // fabrique l'app (la CI construit chaque système sur le sien). ~200 Mo de moins
  // sur macOS. Il n'existe pas de binaire macOS Intel : là, le calage reste à whisper.
  const ONNX_BINAIRES = join(modules, "onnxruntime-node", "bin", "napi-v6");
  const aGarder = join(ONNX_BINAIRES, process.platform, process.arch);
  for (const systeme of ["darwin", "linux", "win32"]) {
    for (const processeur of ["arm64", "x64"]) {
      const target = join(ONNX_BINAIRES, systeme, processeur);
      if (target === aGarder || !existsSync(target)) continue;
      prunedMb += dirSizeMb(target);
      rmSync(target, { recursive: true, force: true });
      console.log(`  - onnxruntime-node/${systeme}/${processeur}`);
    }
  }
  console.log(`[desktop-prepare] pruned ${Math.round(prunedMb)} MB total`);
}
