#!/usr/bin/env node
/**
 * E2E "tour" runner. Drives a target site with Puppeteer (clicks,
 * types, scrolls, etc.), overlays motion-design captions in the DOM,
 * and screenshots frame-by-frame to assemble per-section MP4s with
 * FFmpeg.
 *
 * Multi-section output: a tour is split via `{ type: "section", … }`
 * markers. The runner produces one MP4 per section + a manifest.json.
 * The compositor (compose-tour.ts) then re-films each MP4 inside an
 * animated Mac browser chrome (or iPhone frame for 9:16) with the
 * section's category color as backdrop.
 *
 * Usage:
 *   npx tsx scripts/capture-tour.ts \
 *     --tour-id uzme-landing \
 *     --base-url https://uzme.app \
 *     --fps 30 \
 *     --out ~/.webgen-motion/tours/uzme-landing
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import puppeteer, { type Cookie, type Page } from "puppeteer";
import { getTour } from "../src/lib/tour-loader";
import type { TourEntry, TourStep } from "../src/lib/types/tour";
import type { MotionCategory } from "../src/lib/motion-categories";
import {
  loadAllCategories,
  getCategoryFs as getCategory,
} from "../src/lib/motion-categories-fs";

// `MOTION_CATEGORIES` here resolves through the fs loader so user
// overrides in ~/.webgen-motion/categories.json or ./categories.json
// land in the captured frames.
const MOTION_CATEGORIES = loadAllCategories();

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const tourId = arg("--tour-id");
const baseUrlOverride = arg("--base-url");
const fps = parseInt(arg("--fps", "30") ?? "30", 10);
const outDir = arg("--out", "/tmp/webgen-tour") ?? "/tmp/webgen-tour";
/**
 * --only-section <N>  (1-based)
 * Recapture une seule section, patch le manifest existant au lieu
 * de tout réécrire. Utilisé par l'UI "Recapturer cette section" du
 * Capture tab pour fix une section sans re-filmer tout le tour.
 */
const onlySectionArg = arg("--only-section");
const onlySectionIdx = onlySectionArg
  ? parseInt(onlySectionArg, 10)
  : null;

if (!tourId) {
  console.error("Missing --tour-id");
  process.exit(1);
}

const tour = getTour(tourId);
if (!tour) {
  console.error(`Tour not found: ${tourId}`);
  process.exit(1);
}

// CLI --base-url > tour.baseUrl > localhost:3000.
const baseUrl = (
  baseUrlOverride ??
  tour.baseUrl ??
  "http://localhost:3000"
).replace(/\/$/, "");

// Format-driven viewport. CLI --format overrides catalogue.
const formatArg = arg("--format");
const format: "16:9" | "9:16" =
  formatArg === "9:16" || formatArg === "16:9"
    ? formatArg
    : (tour.format ?? "16:9");
const isPortrait = format === "9:16";
const widthArg = arg("--width");
const heightArg = arg("--height");
const width = parseInt(widthArg ?? (isPortrait ? "1080" : "1920"), 10);
const height = parseInt(heightArg ?? (isPortrait ? "1920" : "1080"), 10);

// Portrait renders the page as a real iPhone so media queries kick in.
// 540×960 logical with deviceScaleFactor=2 → 1080×1920 actual screenshots.
const viewport = isPortrait
  ? { width: 540, height: 960, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width, height, deviceScaleFactor: 1 };
const mobileUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// ── Section planning ──────────────────────────────────────────────

interface SectionPlan {
  index: number;
  category: MotionCategory;
  title: string;
  subtitle?: string;
  gotoDuringSplash?: string;
  splashDwellMs: number;
  steps: TourStep[];
  outFile: string;
}

const DEFAULT_CATEGORY: MotionCategory = MOTION_CATEGORIES.branding;

function planSections(t: TourEntry): SectionPlan[] {
  const plans: SectionPlan[] = [];
  let current: SectionPlan | null = null;
  for (const step of t.steps) {
    if (step.type === "section") {
      const cat = getCategory(step.categoryId) ?? DEFAULT_CATEGORY;
      current = {
        index: plans.length + 1,
        category: cat,
        title: step.title,
        subtitle: step.subtitle,
        gotoDuringSplash: step.goto,
        splashDwellMs: step.dwellMs ?? 2000,
        steps: [],
        outFile: `section-${String(plans.length + 1).padStart(2, "0")}-${cat.id}.mp4`,
      };
      plans.push(current);
    } else {
      if (!current) {
        // Tours without explicit "section" markers fall through to a
        // single default section (no splash card).
        current = {
          index: 1,
          category: DEFAULT_CATEGORY,
          title: t.name,
          subtitle: undefined,
          splashDwellMs: 0,
          steps: [],
          outFile: `section-01-${DEFAULT_CATEGORY.id}.mp4`,
        };
        plans.push(current);
      }
      current.steps.push(step);
    }
  }
  return plans;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main(): Promise<void> {
  // Full capture wipe le outDir et regénère tout. Recapture partielle
  // (--only-section N) garde les MP4s existants et ne touche QUE la
  // section ciblée — sinon on perd 5-10 min à re-filmer pour rien.
  if (onlySectionIdx === null) {
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
  } else {
    mkdirSync(outDir, { recursive: true });
  }

  const allSections = planSections(tour!);
  const sections =
    onlySectionIdx !== null
      ? allSections.filter((s) => s.index === onlySectionIdx)
      : allSections;
  if (onlySectionIdx !== null && sections.length === 0) {
    console.error(
      `Section ${onlySectionIdx} introuvable (le tour a ${allSections.length} section(s)).`,
    );
    process.exit(1);
  }
  const showSplashes = sections.some((s) => s.splashDwellMs > 0);

  console.log(`▶ Tour: ${tour!.name} (${tour!.steps.length} steps · ${sections.length} section${sections.length > 1 ? "s" : ""})`);
  console.log(`  Viewport: ${width}×${height} @ ${fps}fps`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Out dir:  ${outDir}`);
  console.log(`  Splashes: ${showSplashes ? "on (sectioned tour)" : "off (legacy single-MP4)"}`);
  console.log("");

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
      "--hide-scrollbars",
    ],
    defaultViewport: viewport,
  });

  const page = await browser.newPage();
  if (isPortrait) {
    await page.setUserAgent(mobileUserAgent);
    await page.setViewport(viewport);
  }

  const authCookie = process.env.MOTION_TOUR_AUTH_COOKIE;
  if (authCookie && tour!.auth === "admin") {
    const cookies = parseCookieHeader(authCookie, baseUrl);
    if (cookies.length > 0) {
      await page.setCookie(...cookies);
      console.log(`  ✓ Injected ${cookies.length} auth cookie(s)`);
    }
  }

  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error" || t === "warning" || msg.text().startsWith("[motion]")) {
      console.log(`  [page:${t}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    console.log(`  [page:error] ${err.message}`);
  });

  // tsx/esbuild wraps inline functions with a `__name` helper for
  // stack-trace naming. That helper lives in Node, not the page —
  // shipping a `.toString()`'d function with __name calls fails.
  // Install a no-op shim. Passing the script as a string keeps
  // esbuild from rewriting it.
  await page.evaluateOnNewDocument(
    "window.__name = function(fn) { return fn; };",
  );

  console.log(`  ▶ Navigating to ${baseUrl}${tour!.startPath}`);
  await page.goto(baseUrl + tour!.startPath, {
    waitUntil: "networkidle2",
    timeout: 30_000,
  });

  const manifestSections: Array<{
    index: number;
    categoryId: string;
    title: string;
    subtitle?: string;
    file: string;
    durationSec: number;
    sizeBytes: number;
    frames: number;
  }> = [];

  let totalFrames = 0;

  for (const section of sections) {
    console.log("");
    console.log(`━ Section ${section.index}/${sections.length} · ${section.category.label} · "${section.title}"`);
    const sectionFramesDir = join("/tmp", `webgen-frames-${section.index}`);
    rmSync(sectionFramesDir, { recursive: true, force: true });
    mkdirSync(sectionFramesDir, { recursive: true });

    cursorPos = { x: width / 2, y: height / 2 };

    const ctx: CaptureContext = {
      page,
      framesDir: sectionFramesDir,
      frameIdx: 0,
      recording: false,
    };

    if (section.splashDwellMs > 0) {
      await showSplash(page, section.category, section.title, section.subtitle);
      ctx.recording = true;
      await snap(ctx);
      if (section.gotoDuringSplash) {
        await page.goto(baseUrl + section.gotoDuringSplash, {
          waitUntil: "networkidle2",
          timeout: 30_000,
        });
        await showSplash(page, section.category, section.title, section.subtitle);
      }
      await dwell(ctx, section.splashDwellMs);
      await hideSplash(page);
      await dwell(ctx, 350);
    } else {
      ctx.recording = true;
      await snap(ctx);
    }

    await ensureCursor(page);

    for (const [i, step] of section.steps.entries()) {
      console.log(`  [${i + 1}/${section.steps.length}] ${step.type}`);
      try {
        await executeStep(page, step, section.category);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn(`    ⚠ step failed: ${message}`);
      }

      const dwellMs = step.dwellMs ?? 1200;
      await dwell(ctx, dwellMs);

      if (step.type === "overlay") {
        await page.evaluate(() => {
          const el = document.getElementById("__motion-overlay") as HTMLElement | null;
          if (el) {
            el.style.opacity = "0";
            el.style.transform = "translate(-50%, -10px) scale(0.96)";
          }
          const backdrop = document.getElementById(
            "__motion-overlay-backdrop",
          ) as HTMLElement | null;
          if (backdrop) backdrop.style.opacity = "0";
        });
      }
    }

    ctx.recording = false;

    const outPath = join(outDir, section.outFile);
    console.log(`  ▶ ${ctx.frameIdx} frames → ${section.outFile}`);
    encodeMp4(sectionFramesDir, outPath, fps);
    rmSync(sectionFramesDir, { recursive: true, force: true });

    const size = statSync(outPath).size;
    const durationSec = ctx.frameIdx / fps;
    manifestSections.push({
      index: section.index,
      categoryId: section.category.id,
      title: section.title,
      subtitle: section.subtitle,
      file: section.outFile,
      durationSec: Math.round(durationSec * 100) / 100,
      sizeBytes: size,
      frames: ctx.frameIdx,
    });
    totalFrames += ctx.frameIdx;
  }

  await browser.close();

  // Output dimensions = actual screenshot size (logical × dpr).
  const outputWidth = isPortrait ? viewport.width * (viewport.deviceScaleFactor ?? 1) : width;
  const outputHeight = isPortrait ? viewport.height * (viewport.deviceScaleFactor ?? 1) : height;

  const manifestPath = join(outDir, "manifest.json");

  if (onlySectionIdx !== null) {
    // Patch mode : on charge le manifest existant et on remplace la
    // ligne de la section recapturée. Les autres MP4s sont intacts.
    if (!existsSync(manifestPath)) {
      console.error(
        `Recapture partielle impossible : manifest.json absent dans ${outDir}.`,
      );
      process.exit(1);
    }
    const existing = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
      sections: typeof manifestSections;
      totalFrames: number;
      totalDurationSec: number;
      [k: string]: unknown;
    };
    const patched = manifestSections[0];
    const before = existing.sections.find((s) => s.index === patched.index);
    const otherFrames =
      existing.totalFrames - (before?.frames ?? 0);
    existing.sections = existing.sections.map((s) =>
      s.index === patched.index ? patched : s,
    );
    existing.totalFrames = otherFrames + patched.frames;
    existing.totalDurationSec =
      Math.round((existing.totalFrames / fps) * 100) / 100;
    existing.generatedAt = new Date().toISOString();
    writeFileSync(manifestPath, JSON.stringify(existing, null, 2));
    console.log("");
    console.log(
      `✓ Section ${patched.index} recapturée · ${(patched.durationSec).toFixed(1)}s · ${manifestPath}`,
    );
  } else {
    const manifest = {
      tourId,
      format,
      width: outputWidth,
      height: outputHeight,
      fps,
      sections: manifestSections,
      totalFrames,
      totalDurationSec: Math.round((totalFrames / fps) * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log("");
    console.log(`✓ Done · ${sections.length} clip(s) · ${(manifest.totalDurationSec).toFixed(1)}s · ${manifestPath}`);
  }
}

// ── Capture helpers ───────────────────────────────────────────────

interface CaptureContext {
  page: Page;
  framesDir: string;
  frameIdx: number;
  recording: boolean;
}

async function snap(ctx: CaptureContext): Promise<void> {
  const filename = join(
    ctx.framesDir,
    String(ctx.frameIdx).padStart(6, "0") + ".jpg",
  );
  await ctx.page.screenshot({
    path: filename as `${string}.jpg`,
    type: "jpeg",
    quality: 90,
  });
  ctx.frameIdx++;
}

async function dwell(ctx: CaptureContext, ms: number): Promise<void> {
  const frameMs = 1000 / fps;
  const frames = Math.max(1, Math.round(ms / frameMs));
  for (let i = 0; i < frames; i++) {
    await new Promise((r) => setTimeout(r, frameMs));
    if (ctx.recording) await snap(ctx);
  }
}

const FFMPEG_BIN = process.env.WEBGEN_FFMPEG_BIN || "ffmpeg";

function encodeMp4(framesDir: string, outPath: string, fpsArg: number): void {
  const ff = spawnSync(
    FFMPEG_BIN,
    [
      "-y",
      "-framerate",
      String(fpsArg),
      "-i",
      join(framesDir, "%06d.jpg"),
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { stdio: "inherit" },
  );
  if (ff.status !== 0) {
    console.error(`FFmpeg failed (exit ${ff.status})`);
    process.exit(1);
  }
}

// ── DOM injections ────────────────────────────────────────────────

async function showSplash(
  p: Page,
  cat: MotionCategory,
  title: string,
  subtitle: string | undefined,
): Promise<void> {
  await p.evaluate(
    (bgColor, fg, accent, t, sub) => {
      const ID = "__motion-splash";
      let el = document.getElementById(ID) as HTMLDivElement | null;
      if (!el) {
        el = document.createElement("div");
        el.id = ID;
        document.body.appendChild(el);
      }
      el.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:2147483646",
        "background:" + bgColor,
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "justify-content:center",
        "font-family:system-ui,-apple-system,'Segoe UI',sans-serif",
        "opacity:0",
        "transform:scale(0.96)",
        "transition:opacity 600ms cubic-bezier(0.22,0.61,0.36,1), transform 1000ms cubic-bezier(0.22,0.61,0.36,1)",
        "padding:0 8%",
        "text-align:center",
      ].join(";");
      const titleFontSize = "clamp(44px, 8.5vw, 96px)";
      const sigleFontSize = "clamp(18px, 2.5vw, 32px)";
      const stackGap = "clamp(16px, 2.2vw, 28px)";
      const sigleHtml = sub
        ? `<div style="font-size:${sigleFontSize};font-weight:500;color:${accent};letter-spacing:-0.005em;line-height:1.4;max-width:min(1100px, 92vw);">${sub}</div>`
        : "";
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:${stackGap};align-items:center;">
          <div style="font-size:${titleFontSize};font-weight:800;color:${fg};letter-spacing:-0.025em;line-height:1.05;max-width:min(1400px, 92vw);">${t}</div>
          ${sigleHtml}
        </div>
      `;
      void el.offsetWidth;
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
      console.log(`[motion] splash "${t}"`);
    },
    cat.bgColor,
    cat.fg,
    cat.accent,
    title,
    subtitle ?? "",
  );
}

async function hideSplash(p: Page): Promise<void> {
  await p.evaluate(() => {
    const el = document.getElementById("__motion-splash") as HTMLDivElement | null;
    if (!el) return;
    el.style.transition =
      "opacity 350ms cubic-bezier(0.22,0.61,0.36,1), transform 500ms cubic-bezier(0.22,0.61,0.36,1)";
    el.style.opacity = "0";
    el.style.transform = "scale(1.04)";
  });
}

// ── Fake cursor ───────────────────────────────────────────────────

interface CursorPos {
  x: number;
  y: number;
}
let cursorPos: CursorPos = { x: width / 2, y: height / 2 };

async function ensureCursor(p: Page): Promise<void> {
  await p.evaluate(
    (homeX, homeY) => {
      if (document.getElementById("__motion-cursor")) return;
      const cur = document.createElement("div");
      cur.id = "__motion-cursor";
      cur.style.cssText = [
        "position:fixed",
        "top:0",
        "left:0",
        "z-index:2147483645",
        "pointer-events:none",
        `transform:translate3d(${homeX - 3}px, ${homeY - 3}px, 0)`,
        "filter:drop-shadow(0 6px 14px rgba(0,0,0,0.55))",
        "will-change:transform",
        "transition:transform 80ms ease-out",
      ].join(";");
      cur.innerHTML = `
        <svg width="22" height="28" style="display:block;overflow:visible;">
          <path d="M3 3 L3 24 L8 20 L11 27 L14 26 L11 19 L18 19 Z"
            fill="#0B1020" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round" />
        </svg>
      `;
      document.body.appendChild(cur);
      console.log(`[motion] cursor injected at ${homeX},${homeY}`);
    },
    cursorPos.x,
    cursorPos.y,
  );
}

async function moveCursorTo(
  p: Page,
  selector: string,
): Promise<CursorPos | null> {
  const rect = await p.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
  if (!rect) return null;

  const dx = rect.x - cursorPos.x;
  const dy = rect.y - cursorPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dur = Math.max(280, Math.min(900, Math.round(dist * 1.3)));

  await p.evaluate(
    (fx, fy, tx, ty, ms) => {
      const cur = document.getElementById("__motion-cursor") as HTMLDivElement | null;
      if (!cur) return;
      cur.style.transition = "none";
      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        const eased = easeInOutCubic(t);
        const x = fx + (tx - fx) * eased - 3;
        const y = fy + (ty - fy) * eased - 3;
        cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    cursorPos.x,
    cursorPos.y,
    rect.x,
    rect.y,
    dur,
  );
  await new Promise((r) => setTimeout(r, dur + 80));
  cursorPos = rect;
  return rect;
}

async function triggerClickRipple(p: Page): Promise<void> {
  await p.evaluate(
    (cx, cy) => {
      const ripple = document.createElement("div");
      ripple.style.cssText = [
        "position:fixed",
        `top:${cy - 4}px`,
        `left:${cx - 4}px`,
        "width:8px",
        "height:8px",
        "border-radius:9999px",
        "border:2.5px solid rgba(255,255,255,0.95)",
        "background:rgba(255,255,255,0.18)",
        "z-index:2147483644",
        "pointer-events:none",
        "transform:scale(0.8)",
        "opacity:1",
        "transition:transform 620ms cubic-bezier(0.22,0.61,0.36,1), opacity 620ms cubic-bezier(0.22,0.61,0.36,1)",
        "box-shadow:0 0 32px rgba(255,255,255,0.55)",
      ].join(";");
      document.body.appendChild(ripple);
      void ripple.offsetWidth;
      ripple.style.transform = "scale(8)";
      ripple.style.opacity = "0";
      setTimeout(() => ripple.remove(), 720);

      const cur = document.getElementById("__motion-cursor");
      if (cur) {
        cur.style.transition = "transform 120ms cubic-bezier(0.22,0.61,0.36,1)";
        const m = cur.style.transform.match(/translate3d\(([^,]+)px, ([^,]+)px/);
        const x = m ? parseFloat(m[1]) : 0;
        const y = m ? parseFloat(m[2]) : 0;
        cur.style.transform = `translate3d(${x}px, ${y}px, 0) scale(0.85)`;
        setTimeout(() => {
          cur.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
          setTimeout(() => {
            cur.style.transition = "none";
          }, 130);
        }, 130);
      }
    },
    cursorPos.x,
    cursorPos.y,
  );
}

async function executeStep(
  p: Page,
  step: TourStep,
  activeCategory: MotionCategory,
): Promise<void> {
  switch (step.type) {
    case "section":
      // Consumed by planSections — should never reach here.
      break;
    case "goto":
      await p.goto(baseUrl + step.url, {
        waitUntil: "networkidle2",
        timeout: 30_000,
      });
      break;
    case "click":
      await p.waitForSelector(step.selector, { timeout: 5000 });
      await ensureCursor(p);
      await moveCursorTo(p, step.selector);
      await triggerClickRipple(p);
      await new Promise((r) => setTimeout(r, 120));
      // Use DOM-level .click() rather than Puppeteer's coordinate
      // click — the fake cursor + ripple overlays plus any scroll
      // shift during the dwell would push the physical hit point
      // off-target. Dispatching directly on the element guarantees
      // the React onClick fires regardless of pixel state.
      await p.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        el?.click();
      }, step.selector);
      break;
    case "type":
      await p.waitForSelector(step.selector, { timeout: 5000 });
      await ensureCursor(p);
      await moveCursorTo(p, step.selector);
      await triggerClickRipple(p);
      await new Promise((r) => setTimeout(r, 120));
      // Focus the input by selector, then type into it. focus() also
      // dispatches the React focus handler; subsequent .type() sends
      // keystroke events the framework picks up.
      await p.focus(step.selector);
      await p.type(step.selector, step.text, { delay: 40 });
      break;
    case "select":
      await p.waitForSelector(step.selector, { timeout: 5000 });
      await ensureCursor(p);
      await moveCursorTo(p, step.selector);
      await triggerClickRipple(p);
      await new Promise((r) => setTimeout(r, 120));
      await p.select(step.selector, step.value);
      break;
    case "hover":
      await p.waitForSelector(step.selector, { timeout: 5000 });
      await ensureCursor(p);
      await moveCursorTo(p, step.selector);
      await p.hover(step.selector);
      break;
    case "scroll": {
      const dwellArg = step.dwellMs ?? 1200;
      const scrollMs = Math.max(400, Math.min(1500, Math.round(dwellArg * 0.7)));
      await p.evaluate(
        (target, dur, sel) => {
          const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
          const from = el ? el.scrollTop : window.scrollY;
          const distance = target - from;
          if (Math.abs(distance) < 1) return;
          const easeInOutCubic = (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / dur);
            const y = from + distance * easeInOutCubic(t);
            if (el) el.scrollTop = y;
            else window.scrollTo(0, y);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          console.log(`[motion] scroll ${sel || "window"} ${from}→${target} (${dur}ms)`);
        },
        step.to,
        scrollMs,
        step.selector ?? null,
      );
      break;
    }
    case "wait":
      break;
    case "overlay": {
      const overrideCat = step.categoryId ? getCategory(step.categoryId) : null;
      const cat = overrideCat ?? activeCategory;
      const position = step.position ?? "center";
      await p.evaluate(
        (text, pos, accent) => {
          if (!document.body) {
            console.warn(`[motion] overlay called before body: "${text}"`);
            return;
          }
          const isCenter = pos === "center";
          const BACKDROP_ID = "__motion-overlay-backdrop";
          let backdrop = document.getElementById(BACKDROP_ID) as HTMLDivElement | null;
          if (isCenter) {
            if (!backdrop) {
              backdrop = document.createElement("div");
              backdrop.id = BACKDROP_ID;
              backdrop.style.cssText = [
                "position:fixed",
                "inset:0",
                "z-index:2147483646",
                "background:rgba(8,8,12,0.62)",
                "backdrop-filter:blur(2px)",
                "-webkit-backdrop-filter:blur(2px)",
                "opacity:0",
                "transition:opacity 320ms cubic-bezier(0.22,0.61,0.36,1)",
                "pointer-events:none",
              ].join(";");
              document.body.appendChild(backdrop);
            }
            void backdrop.offsetWidth;
            backdrop.style.opacity = "1";
          } else if (backdrop) {
            backdrop.style.opacity = "0";
          }

          const ID = "__motion-overlay";
          let el = document.getElementById(ID) as HTMLDivElement | null;
          if (!el) {
            el = document.createElement("div");
            el.id = ID;
            document.body.appendChild(el);
          }
          const centerFontSize = "clamp(28px, 6.4vw, 64px)";
          const pillFontSize = "clamp(15px, 2.2vw, 28px)";
          const pillPadX = "clamp(18px, 2.6vw, 44px)";
          const pillPadY = "clamp(12px, 1.6vw, 22px)";
          el.style.cssText = [
            "position:fixed",
            "left:50%",
            "z-index:2147483647",
            isCenter ? "padding:0 6%" : `padding:${pillPadY} ${pillPadX}`,
            isCenter ? "border-radius:0" : "border-radius:9999px",
            "font-family:system-ui,-apple-system,'Segoe UI',sans-serif",
            isCenter ? `font-size:${centerFontSize}` : `font-size:${pillFontSize}`,
            isCenter ? "font-weight:800" : "font-weight:700",
            isCenter ? "letter-spacing:-0.025em" : "letter-spacing:-0.015em",
            "line-height:1.1",
            "color:#FFFFFF",
            isCenter
              ? "background:transparent"
              : `background:linear-gradient(135deg, rgba(15,17,23,0.88), rgba(20,22,30,0.85))`,
            isCenter ? "" : "backdrop-filter:blur(16px) saturate(1.4)",
            isCenter ? "" : "-webkit-backdrop-filter:blur(16px) saturate(1.4)",
            isCenter
              ? "text-shadow:0 6px 28px rgba(0,0,0,0.75)"
              : `box-shadow:0 18px 60px rgba(0,0,0,0.55), 0 0 0 1px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.18)`,
            "opacity:0",
            "pointer-events:none",
            "white-space:normal",
            "text-align:center",
            isCenter ? "max-width:84vw" : "max-width:88vw",
            "transition:opacity 380ms cubic-bezier(0.22,0.61,0.36,1), transform 520ms cubic-bezier(0.22,0.61,0.36,1)",
          ].filter(Boolean).join(";");
          if (isCenter) {
            const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            el.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:clamp(12px, 1.6vw, 22px);">
                <div>${safe}</div>
                <div style="width:clamp(56px, 6vw, 96px);height:4px;border-radius:9999px;background:${accent};box-shadow:0 0 24px ${accent}aa;"></div>
              </div>
            `;
          } else {
            el.textContent = text;
          }

          if (pos === "top") {
            el.style.top = "8%";
            el.style.bottom = "";
          } else if (pos === "center") {
            el.style.top = "50%";
            el.style.bottom = "";
          } else {
            el.style.bottom = "10%";
            el.style.top = "";
          }
          const enterFrom = pos === "center" ? "translate(-50%, -42%) scale(0.94)" : "translate(-50%, 28px) scale(0.94)";
          const enterTo = pos === "center" ? "translate(-50%, -50%) scale(1)" : "translate(-50%, 0) scale(1)";
          el.style.opacity = "0";
          el.style.transform = enterFrom;
          void el.offsetWidth;
          el.style.opacity = "1";
          el.style.transform = enterTo;
          console.log(`[motion] overlay "${text}" (${pos})`);
        },
        step.text,
        position,
        cat.accent,
      );
      break;
    }
    case "keypress":
      await p.keyboard.press(step.key as Parameters<Page["keyboard"]["press"]>[0]);
      break;
  }
}

function parseCookieHeader(cookieHeader: string, urlString: string): Cookie[] {
  const u = new URL(urlString);
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p): Cookie | null => {
      const eq = p.indexOf("=");
      if (eq === -1) return null;
      return {
        name: p.slice(0, eq).trim(),
        value: p.slice(eq + 1).trim(),
        domain: u.hostname,
        path: "/",
        expires: -1,
        size: 0,
        httpOnly: false,
        secure: u.protocol === "https:",
        session: true,
        sameParty: false,
        sourceScheme: "Unset" as Cookie["sourceScheme"],
      };
    })
    .filter((c): c is Cookie => c !== null);
}
