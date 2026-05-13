#!/usr/bin/env node
/**
 * Scaffolder Sprint 6 — scanne un repo Next.js cible et émet des
 * fichiers `tours/<route-slug>.json` squelettes pour chaque route
 * détectée. Pair parfait avec l'Agent IA (Sprint 5) : ici on génère
 * la STRUCTURE depuis le code source (rapide, fiable, multi-routes),
 * l'Agent enrichit ensuite le NARRATIF + les valeurs scrollY depuis
 * la page rendue.
 *
 * Args :
 *   --project-path <path>     REQUIS — chemin absolu vers le repo Next.js
 *                              cible (app router ou pages router).
 *   --base-url <url>          REQUIS — où le projet sera servi pendant
 *                              la capture (généralement http://localhost:3000).
 *   --max-tours <n>           Cap optionnel sur le nombre de tours à
 *                              générer (default 10).
 *   --out-dir <path>          Où écrire les tours JSON (default
 *                              `<projectPath>/tours-scaffold/`).
 *   --format <16:9|9:16>      Default 16:9.
 *
 * Détection des routes :
 *   - Next.js 13+ App Router : récupère `<projectPath>/src/app/* * /page.tsx`
 *     (ou `<projectPath>/app/* * /page.tsx`). Ignore les
 *     dossiers `_*`, `(group)/*` est traité comme route plate.
 *   - Pages Router (legacy) : `<projectPath>/src/pages/* * .tsx`
 *     ou `<projectPath>/pages/* * .tsx`.
 *
 * Pour chaque route détectée :
 *   1. Lit le source du page.tsx
 *   2. Extrait les headings inline (h1, h2, h3) ou strings dans JSX
 *   3. Construit un TourEntry avec :
 *       - id : kebab-case slug de la route ("/", "/about" → "home", "about")
 *       - name : Title Case de la route
 *       - baseUrl : le baseUrl fourni
 *       - startPath : la route
 *       - steps : section "branding" + scroll + wait pour chaque
 *         heading détecté
 *   4. Écrit `<outDir>/<id>.json` (skip si existe déjà)
 *
 * L'utilisateur peut ensuite :
 *   - Ouvrir webgen-motion → tab Script → enrichir chaque tour
 *   - OU passer chaque tour à l'Agent IA pour completion narrative
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const projectPath = arg("--project-path");
const baseUrl = arg("--base-url", "http://localhost:3000")!;
const maxTours = parseInt(arg("--max-tours", "10") ?? "10", 10);
const formatArg = (arg("--format", "16:9") ?? "16:9") as "16:9" | "9:16";

if (!projectPath || !existsSync(projectPath)) {
  emit({ type: "error", message: "Missing or invalid --project-path" });
  process.exit(1);
}

const absProject = resolve(projectPath);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = arg("--out-dir", join(absProject, "tours-scaffold"))!;
mkdirSync(outDir, { recursive: true });

emit({
  type: "phase",
  label: `Scan ${absProject}`,
});

interface DetectedRoute {
  routePath: string;       // ex: "/", "/about", "/blog/[slug]"
  filePath: string;        // chemin absolu vers le page.tsx
  source: "app" | "pages";
}

const routes = detectRoutes(absProject);
emit({
  type: "info",
  message: `${routes.length} route(s) détectée(s)`,
});

if (routes.length === 0) {
  emit({
    type: "warn",
    message:
      "Aucune route détectée. Le projet n'est pas un Next.js App/Pages router, ou la structure est non standard.",
  });
  process.exit(0);
}

let scaffolded = 0;
let skipped = 0;
for (const route of routes.slice(0, maxTours)) {
  const tour = buildTour(route, baseUrl, formatArg);
  const outPath = join(outDir, `${tour.id}.json`);
  if (existsSync(outPath)) {
    emit({
      type: "info",
      message: `skip ${tour.id} (déjà présent)`,
    });
    skipped++;
    continue;
  }
  writeFileSync(outPath, JSON.stringify(tour, null, 2));
  emit({
    type: "info",
    message: `✓ ${relative(absProject, outPath)} · ${tour.steps.length} steps`,
  });
  scaffolded++;
}

emit({
  type: "done",
  scaffolded,
  skipped,
  total: routes.length,
  outDir,
});

// ─── Detection ─────────────────────────────────────────────────────

function detectRoutes(root: string): DetectedRoute[] {
  // Look for App Router first (Next 13+), fall back to Pages Router.
  const appCandidates = [
    join(root, "src", "app"),
    join(root, "app"),
  ];
  for (const c of appCandidates) {
    if (existsSync(c) && statSync(c).isDirectory()) {
      return walkAppRouter(c, "");
    }
  }
  const pagesCandidates = [join(root, "src", "pages"), join(root, "pages")];
  for (const c of pagesCandidates) {
    if (existsSync(c) && statSync(c).isDirectory()) {
      return walkPagesRouter(c, "");
    }
  }
  return [];
}

function walkAppRouter(dir: string, routePrefix: string): DetectedRoute[] {
  const results: DetectedRoute[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("_") || entry === "node_modules") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // "(group)" segments don't add to the route — they're org folders.
      const segment = entry.startsWith("(") && entry.endsWith(")")
        ? ""
        : entry;
      const nextPrefix = segment ? `${routePrefix}/${segment}` : routePrefix;
      results.push(...walkAppRouter(full, nextPrefix));
    } else if (
      entry === "page.tsx" ||
      entry === "page.ts" ||
      entry === "page.jsx" ||
      entry === "page.js"
    ) {
      results.push({
        routePath: routePrefix === "" ? "/" : routePrefix,
        filePath: full,
        source: "app",
      });
    }
  }
  return results;
}

function walkPagesRouter(dir: string, routePrefix: string): DetectedRoute[] {
  const results: DetectedRoute[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("_") || entry === "api" || entry === "node_modules") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkPagesRouter(full, `${routePrefix}/${entry}`));
    } else if (/\.(tsx?|jsx?)$/.test(entry) && entry !== "index.tsx") {
      const name = entry.replace(/\.(tsx?|jsx?)$/, "");
      results.push({
        routePath: `${routePrefix}/${name}`,
        filePath: full,
        source: "pages",
      });
    } else if (entry === "index.tsx" || entry === "index.ts" || entry === "index.jsx" || entry === "index.js") {
      results.push({
        routePath: routePrefix === "" ? "/" : routePrefix,
        filePath: full,
        source: "pages",
      });
    }
  }
  return results;
}

// ─── Tour shape ────────────────────────────────────────────────────

function buildTour(
  route: DetectedRoute,
  baseUrl: string,
  format: "16:9" | "9:16",
) {
  const slug = slugify(route.routePath);
  const name = humanize(route.routePath);
  const source = readFileSync(route.filePath, "utf-8");
  const headings = extractHeadings(source);

  // Default to a 3-section skeleton if we couldn't extract anything.
  const sections =
    headings.length > 0
      ? headings.slice(0, 6)
      : [
          { tag: "h1", text: name },
          { tag: "h2", text: "Section 1" },
          { tag: "h2", text: "Call to action" },
        ];

  const steps: Array<Record<string, unknown>> = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const category =
      i === 0
        ? "branding"
        : s.text.match(/cta|sign|start|essai|commencer/i)
          ? "cta"
          : s.text.match(/price|tarif|cost/i)
            ? "pricing"
            : s.text.match(/test|avis|client/i)
              ? "testimonials"
              : "features";
    steps.push({
      type: "section",
      categoryId: category,
      title: s.text.slice(0, 60),
      dwellMs: 2500,
    });
    // No scroll on first section (page is already at top). Subsequent
    // sections need a scroll to a guesstimated Y — the Agent IA will
    // refine this with real scrollY values via realignScrollsToSnapshot.
    if (i > 0) {
      steps.push({
        type: "scroll",
        to: i * 900, // crude approximation, agent will fix it
        dwellMs: 1500,
      });
    }
    steps.push({ type: "wait", dwellMs: 1500 });
  }

  return {
    id: slug,
    name,
    description: `Tour scaffolded from ${route.routePath} (refine via Agent IA or manual edit)`,
    estimatedSec: Math.round((steps.length * 3.5) * 10) / 10,
    startPath: route.routePath,
    baseUrl,
    format,
    voiceMode: "narrative",
    narrativeScript: `[step:0] ${name}. Lorem ipsum dolor sit amet — édite ce script depuis le tab Script ou demande à l'Agent IA d'enrichir le narratif depuis l'URL ${baseUrl}${route.routePath}.`,
    composeStyle: "energetic",
    steps,
  };
}

function extractHeadings(source: string): Array<{ tag: string; text: string }> {
  const matches: Array<{ tag: string; text: string }> = [];
  // Match JSX <h1>...</h1>, <h2>...</h2>, <h3>...</h3> with simple
  // text content. Doesn't handle complex children — that's fine for
  // a heuristic scaffolder.
  const re = /<(h[1-3])[^>]*>([^<{][^<]*?)<\/h[1-3]>/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const tag = m[1];
    const text = m[2].replace(/\s+/g, " ").trim();
    if (text.length >= 2 && text.length <= 120) {
      matches.push({ tag, text });
    }
  }
  return matches;
}

function slugify(route: string): string {
  if (route === "/") return "home";
  return route
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\[(\w+)\]/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanize(route: string): string {
  if (route === "/") return "Home";
  return route
    .replace(/^\/+|\/+$/g, "")
    .replace(/\[(\w+)\]/g, "$1")
    .split("/")
    .pop()!
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── NDJSON event emit (compatible avec les autres runners) ────────

function emit(event: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(event) + "\n");
}
