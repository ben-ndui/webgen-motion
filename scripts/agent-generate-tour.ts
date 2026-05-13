#!/usr/bin/env node
/**
 * Agent IA — génère un fichier `tours/<id>.json` à partir d'une URL.
 *
 * Pipeline :
 *   1. Lance Puppeteer headless sur la base_url
 *   2. Extrait un SiteSnapshot (sections, éléments interactifs,
 *      screenshot full-page JPEG si multimodal demandé)
 *   3. Envoie au provider LLM résolu (cf. src/lib/config.ts →
 *      resolveAgent + createProvider)
 *   4. Valide la sortie via isGeneratedTour()
 *   5. Écrit tours/<id>.json + stream NDJSON progress pour l'UI
 *
 * Args :
 *   --base-url <url>          REQUIS — site à analyser
 *   --output-id <slug>        REQUIS — nom du fichier sortie (tours/<slug>.json)
 *   --preset <name>           pitch (default) / demo / walkthrough / showcase
 *   --format <ratio>          16:9 (default) / 9:16
 *   --tone <name>             premium (default) / playful / tech / educational
 *   --no-screenshot           skip le screenshot multimodal (économise tokens)
 *
 * Spawned par /api/motion/tour/generate/run via resolveRunnerSpawn().
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type {
  SiteSnapshot,
  SiteSection,
  SiteInteractiveElement,
  GenerateTourParams,
} from "../src/lib/llm-providers/base";
import { createProvider } from "../src/lib/llm-providers";
import { resolveAgent } from "../src/lib/config";

// ── CLI parsing ───────────────────────────────────────────────────
function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}
function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const baseUrl = arg("--base-url");
const outputId = arg("--output-id");
const preset = (arg("--preset", "pitch") ?? "pitch") as
  | "pitch"
  | "demo"
  | "walkthrough"
  | "showcase";
const format = (arg("--format", "16:9") ?? "16:9") as "16:9" | "9:16";
const tone = arg("--tone", "premium");
const skipScreenshot = hasFlag("--no-screenshot");

if (!baseUrl) {
  emit({ type: "error", message: "Missing --base-url" });
  process.exit(1);
}
if (!outputId || !/^[\w-]+$/.test(outputId)) {
  emit({ type: "error", message: "Missing or invalid --output-id (slug a-z 0-9 -)" });
  process.exit(1);
}

// ── Resolve agent provider ─────────────────────────────────────────
const agent = resolveAgent();
if (!agent) {
  emit({
    type: "error",
    message:
      "Agent IA pas configuré. Ouvre /setup/agent pour coller ta clé API.",
  });
  process.exit(1);
}

// ── Main ───────────────────────────────────────────────────────────
main().catch((err) => {
  emit({ type: "error", message: (err as Error).message });
  process.exit(1);
});

async function main(): Promise<void> {
  emit({ type: "phase", label: "Lancement du navigateur…" });
  const browser = await launchBrowser();
  try {
    emit({ type: "phase", label: `Navigation vers ${baseUrl}` });
    const page = await openPage(browser, baseUrl!);
    emit({ type: "phase", label: "Extraction de la structure…" });
    const snapshot = await extractSnapshot(page, baseUrl!);
    emit({
      type: "info",
      message: `${snapshot.sections.length} sections, ${snapshot.interactiveElements.length} éléments interactifs`,
    });

    if (!skipScreenshot) {
      emit({ type: "phase", label: "Capture screenshot multimodal…" });
      snapshot.screenshot = await captureScreenshot(page);
    }

    await browser.close();

    emit({
      type: "phase",
      label: `Génération via ${agent.provider}/${agent.model}…`,
    });
    const provider = createProvider({
      kind: agent.provider,
      apiKey: agent.apiKey,
      model: agent.model,
    });
    const params: GenerateTourParams = {
      snapshot,
      preset,
      format,
      tone,
    };
    const result = await provider.generateTour(params);

    // Force the id + baseUrl to what we resolved ourselves — even if
    // the model invents something different, we know our values are
    // canonical.
    result.tour.id = outputId!;
    result.tour.baseUrl = baseUrl!;

    const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const toursDir = join(repoRoot, "tours");
    mkdirSync(toursDir, { recursive: true });
    const outPath = join(toursDir, `${outputId}.json`);
    if (existsSync(outPath)) {
      emit({
        type: "warn",
        message: `tours/${outputId}.json existe — écrasement`,
      });
    }
    writeFileSync(outPath, JSON.stringify(result.tour, null, 2));

    emit({
      type: "done",
      tourId: outputId,
      path: `tours/${outputId}.json`,
      stepCount: result.tour.steps.length,
      estimatedSec: result.tour.estimatedSec,
      usage: result.usage,
    });
  } finally {
    try {
      await browser.close();
    } catch {}
  }
}

// ── Puppeteer helpers ──────────────────────────────────────────────
async function launchBrowser(): Promise<Browser> {
  // Tour-capture uses 1920×1080 / 1080×1920 — for agent scraping we
  // pick desktop 1920×1080 by default because most marketing pages
  // are designed with desktop signals first. The --format=9:16 only
  // affects the output tour metadata, not the scraping viewport.
  return puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function openPage(browser: Browser, url: string): Promise<Page> {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(45_000);
  await page.goto(url, { waitUntil: "networkidle2" });
  // Some sites lazy-load below the fold — scroll to bottom + back
  // so heroes, features, etc. are all materialized before we extract.
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const totalHeight = document.documentElement.scrollHeight;
    const step = window.innerHeight / 2;
    for (let y = 0; y < totalHeight; y += step) {
      window.scrollTo(0, y);
      await sleep(120);
    }
    window.scrollTo(0, 0);
    await sleep(200);
  });
  return page;
}

// ── Extraction ─────────────────────────────────────────────────────
async function extractSnapshot(
  page: Page,
  url: string,
): Promise<SiteSnapshot> {
  const { title, description, sections, interactiveElements } =
    await page.evaluate(() => {
      // ─ Helpers ───────────────────────────────────────────────────
      function cssPath(el: Element): string {
        // Prefer data-tour-step / data-element / id / a stable class
        // chain. Fallback to nth-of-type if the element has nothing
        // unique. Capture-tour reuses these selectors, so they need
        // to survive minor layout changes.
        const ds = el.getAttribute("data-tour-step") ?? el.getAttribute("data-element");
        if (ds) return `[data-tour-step="${ds}"], [data-element="${ds}"]`;
        if (el.id) return `#${el.id}`;
        const path: string[] = [];
        let cur: Element | null = el;
        while (cur && cur.nodeType === 1 && cur.tagName !== "BODY") {
          let seg = cur.tagName.toLowerCase();
          const cls = cur.getAttribute("class")?.split(/\s+/).filter(Boolean) ?? [];
          // Skip Tailwind / utility classes — too volatile.
          const stable = cls.find(
            (c) => !/^(?:p|m|w|h|text|bg|flex|grid|gap|rounded|border|hover:|md:|lg:|sm:|xl:)/.test(c),
          );
          if (stable) seg += `.${stable}`;
          const parent = cur.parentElement;
          if (parent) {
            const sameTag = Array.from(parent.children).filter(
              (c) => c.tagName === cur!.tagName,
            );
            if (sameTag.length > 1) {
              const idx = sameTag.indexOf(cur) + 1;
              seg += `:nth-of-type(${idx})`;
            }
          }
          path.unshift(seg);
          cur = cur.parentElement;
          if (path.length >= 4) break;
        }
        return path.join(" > ");
      }
      function trimText(s: string | null | undefined, max = 500): string {
        if (!s) return "";
        const t = s.replace(/\s+/g, " ").trim();
        return t.length > max ? `${t.slice(0, max - 1)}…` : t;
      }

      // ─ Page meta ────────────────────────────────────────────────
      const title = document.title || "";
      const description =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") ??
        document
          .querySelector('meta[property="og:description"]')
          ?.getAttribute("content") ??
        "";

      // ─ Sections detection ───────────────────────────────────────
      const seenSections = new Set<Element>();
      const sectionEls: Element[] = [];
      // Priority 1 : explicit tour markers
      for (const el of document.querySelectorAll(
        "[data-tour-section], [data-section]",
      )) {
        if (!seenSections.has(el)) {
          seenSections.add(el);
          sectionEls.push(el);
        }
      }
      // Priority 2 : semantic <section> / <main role="main"> /
      // <article> with at least a heading inside (avoids picking
      // empty <section> wrappers)
      for (const el of document.querySelectorAll("section, article, main")) {
        if (seenSections.has(el)) continue;
        const heading = el.querySelector("h1, h2");
        if (heading) {
          seenSections.add(el);
          sectionEls.push(el);
        }
      }
      // Cap to top-12 sections to keep the prompt size reasonable.
      const sections = sectionEls.slice(0, 12).map((el, i) => {
        const explicitId =
          el.getAttribute("data-tour-section") ??
          el.getAttribute("data-section") ??
          el.id ??
          undefined;
        const heading = el.querySelector("h1, h2");
        const firstP = el.querySelector("p");
        return {
          id: explicitId ?? `section-${i + 1}`,
          heading: trimText(heading?.textContent, 120) || `Section ${i + 1}`,
          excerpt: trimText(firstP?.textContent ?? el.textContent, 500),
          selector: cssPath(el),
        };
      });

      // ─ Interactive elements ─────────────────────────────────────
      const interactiveEls: Element[] = [];
      const seenInteract = new Set<Element>();
      for (const el of document.querySelectorAll(
        "[data-tour-step], [data-element]",
      )) {
        if (!seenInteract.has(el)) {
          seenInteract.add(el);
          interactiveEls.push(el);
        }
      }
      // Add primary CTAs : buttons + anchors with explicit href.
      // Skip nav-only links to keep noise low.
      for (const el of document.querySelectorAll(
        "button, a[href]:not([href^='#']):not([href^='/?'])",
      )) {
        if (seenInteract.has(el)) continue;
        const txt = el.textContent?.trim() ?? "";
        if (txt.length === 0 || txt.length > 60) continue;
        seenInteract.add(el);
        interactiveEls.push(el);
        if (interactiveEls.length >= 40) break;
      }

      const interactiveElements = interactiveEls.slice(0, 40).map((el, i) => {
        const explicitId =
          el.getAttribute("data-tour-step") ??
          el.getAttribute("data-element") ??
          el.id ??
          undefined;
        // Figure out which section ancestor we're under.
        let sectionId: string | undefined;
        let cur: Element | null = el.parentElement;
        while (cur) {
          if (seenSections.has(cur)) {
            sectionId =
              cur.getAttribute("data-tour-section") ??
              cur.getAttribute("data-section") ??
              cur.id ??
              undefined;
            break;
          }
          cur = cur.parentElement;
        }
        return {
          id: explicitId ?? `el-${i + 1}`,
          kind: el.tagName.toLowerCase(),
          label: trimText(
            el.getAttribute("aria-label") ??
              el.getAttribute("title") ??
              el.textContent,
            80,
          ),
          selector: cssPath(el),
          sectionId,
        };
      });

      return { title, description, sections, interactiveElements };
    });

  return {
    url,
    title,
    description,
    sections: sections as SiteSection[],
    interactiveElements: interactiveElements as SiteInteractiveElement[],
  };
}

// ── Screenshot ─────────────────────────────────────────────────────
async function captureScreenshot(page: Page): Promise<string> {
  // Full-page JPEG at quality 70 — keeps the payload around 200-400
  // KB even for long landing pages. Claude's image cap is 5 MB so
  // we're comfortable. Encoded base64 (no data: prefix — provider
  // wraps it).
  const buf = await page.screenshot({
    fullPage: true,
    type: "jpeg",
    quality: 70,
  });
  return Buffer.from(buf).toString("base64");
}

// ── Stream emission ────────────────────────────────────────────────
function emit(event: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(event) + "\n");
}
