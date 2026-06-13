#!/usr/bin/env node
/**
 * Mobile capture runner (Sprint D) — films a NATIVE app section by
 * section, driven by Maestro flows, recorded by the platform tools :
 *
 *   iOS     : `xcrun simctl io <udid> recordVideo` (Simulator)
 *   Android : `adb shell screenrecord` (Emulator / device)
 *
 * Produces the SAME artifacts as the web runner (capture-tour.ts) —
 * per-section MP4s (h264 CFR 30fps yuv420p) + manifest.json with
 * `stepTimings` — so the whole downstream pipeline (audio, Edit
 * Engine, Remotion compose, frames 3D iPhone) works unchanged.
 *
 * Differences with the web runner :
 *   - Splash cards are NOT burned into the capture (no DOM to inject
 *     into). The manifest carries `postSplashSec` instead and the
 *     Remotion SectionPlayer renders the splash card at compose time.
 *   - Steps are the mobile subset : launchApp / tapOn / inputText /
 *     swipe / back / wait / overlay (overlay = dwell only for now,
 *     post-compositing chantier listed in docs/design/ANALYSE-MONTAGE.md).
 *
 * Usage:
 *   npx tsx scripts/capture-mobile.ts \
 *     --tour-id my-app-tour \
 *     --out ~/.webgen-motion/tours/my-app-tour \
 *     [--device <udid|adb-serial>] [--fps 30] [--platform ios|android]
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  resolveMaestro,
  resolveJavaHome,
} from "../src/lib/server/mobile-tools-install";
import { getTour } from "../src/lib/tour-loader";
import type { TourEntry, TourStep } from "../src/lib/types/tour";
import type { MotionCategory } from "../src/lib/motion-categories";
import {
  loadAllCategories,
  getCategoryFs as getCategory,
} from "../src/lib/motion-categories-fs";

const MOTION_CATEGORIES = loadAllCategories();

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const tourId = arg("--tour-id");
const fps = parseInt(arg("--fps", "30") ?? "30", 10);
const outDir = arg("--out", "/tmp/webgen-mobile-tour") ?? "/tmp/webgen-mobile-tour";
const deviceArg = arg("--device");
const platformArg = arg("--platform");

if (!tourId) {
  console.error("Missing --tour-id");
  process.exit(1);
}
const tour = getTour(tourId);
if (!tour) {
  console.error(`Tour not found: ${tourId}`);
  process.exit(1);
}
const platform = (platformArg ?? tour.platform) as "ios" | "android" | undefined;
if (platform !== "ios" && platform !== "android") {
  console.error(
    `Ce tour n'est pas mobile (platform="${tour.platform ?? "web"}"). Utilise capture-tour.ts pour le web, ou mets platform: "ios" | "android" dans le tour JSON.`,
  );
  process.exit(1);
}
const appId = tour.appId;
if (!appId) {
  console.error(`Tour mobile sans appId — ajoute "appId": "com.example.app" dans le tour JSON.`);
  process.exit(1);
}
const device = deviceArg ?? tour.deviceId;

const FFMPEG_BIN = process.env.WEBGEN_FFMPEG_BIN || "ffmpeg";
// Maestro : env > cache app (installé à la demande) > système. + JRE bundlé
// si dispo → on l'injecte via JAVA_HOME pour que Maestro tourne sans JDK système.
const _maestro = resolveMaestro();
const MAESTRO_BIN = _maestro?.bin ?? "maestro";
const _javaHome = resolveJavaHome();
const MAESTRO_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  MAESTRO_CLI_NO_ANALYTICS: "1",
  ...(_javaHome
    ? { JAVA_HOME: _javaHome, PATH: `${_javaHome}/bin:${process.env.PATH ?? ""}` }
    : {}),
};
const ADB_BIN = process.env.WEBGEN_ADB_BIN || "adb";

// ── Section planning (mirror of capture-tour's planSections) ──────

interface PlannedStep {
  step: TourStep;
  linearIdx: number;
}

interface SectionPlan {
  index: number;
  category: MotionCategory;
  title: string;
  subtitle?: string;
  splashDwellMs: number;
  steps: PlannedStep[];
  outFile: string;
}

interface StepTiming {
  linearIdx: number;
  type: string;
  dwellStartSec: number;
  dwellSec: number;
  /** True when the timing couldn't be parsed from the Maestro log
   *  and was estimated from the dwell budget instead. */
  estimated?: boolean;
}

const DEFAULT_CATEGORY: MotionCategory = MOTION_CATEGORIES.branding;
const WEB_ONLY_STEPS = new Set([
  "goto", "click", "type", "select", "hover", "scroll", "keypress",
]);

function planSections(t: TourEntry): SectionPlan[] {
  const plans: SectionPlan[] = [];
  let current: SectionPlan | null = null;
  for (const [linearIdx, step] of t.steps.entries()) {
    if (step.type === "section") {
      const cat = getCategory(step.categoryId) ?? DEFAULT_CATEGORY;
      current = {
        index: plans.length + 1,
        category: cat,
        title: step.title,
        subtitle: step.subtitle,
        splashDwellMs: step.dwellMs ?? 2000,
        steps: [],
        outFile: `section-${String(plans.length + 1).padStart(2, "0")}-${cat.id}.mp4`,
      };
      plans.push(current);
    } else {
      if (WEB_ONLY_STEPS.has(step.type)) {
        console.error(
          `Step "${step.type}" (idx ${linearIdx}) est web-only — un tour mobile utilise launchApp / tapOn / inputText / swipe / back / wait / overlay.`,
        );
        process.exit(1);
      }
      if (!current) {
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
      current.steps.push({ step, linearIdx });
    }
  }
  return plans;
}

// ── Maestro flow generation ───────────────────────────────────────

/** Fixed-duration dwell. Maestro has no sleep command by design —
 *  the canonical workaround is an `extendedWaitUntil` on an element
 *  that will never appear, marked `optional` so the timeout doesn't
 *  fail the flow. The command waits the FULL timeout. */
function dwellYaml(ms: number): string {
  return [
    `- extendedWaitUntil:`,
    `    optional: true`,
    `    visible:`,
    `        text: "__webgen_dwell_${ms}__"`,
    `    timeout: ${ms}`,
  ].join("\n");
}

function yamlQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function stepYaml(step: TourStep): string | null {
  switch (step.type) {
    case "launchApp":
      return step.clearState
        ? `- launchApp:\n    clearState: true`
        : `- launchApp`;
    case "tapOn":
      if (step.id) return `- tapOn:\n    id: ${yamlQuote(step.id)}`;
      if (step.text) return `- tapOn: ${yamlQuote(step.text)}`;
      throw new Error(`tapOn sans "text" ni "id"`);
    case "inputText":
      return `- inputText: ${yamlQuote(step.text)}`;
    case "swipe":
      return `- swipe:\n    direction: ${step.direction.toUpperCase()}\n    duration: 600`;
    case "back":
      // Maestro `back` est Android-only ; sur iOS on émule le geste
      // retour natif : swipe depuis le bord gauche de l'écran.
      return platform === "android"
        ? `- back`
        : `- swipe:\n    start: "1%, 50%"\n    end: "70%, 50%"\n    duration: 400`;
    case "wait":
    case "overlay":
      // Pure dwell — overlays are composited by Remotion (post), not
      // injected in the app.
      return null;
    default:
      throw new Error(`Step "${step.type}" non supporté en capture mobile`);
  }
}

function buildSectionFlow(section: SectionPlan): string {
  const lines: string[] = [`appId: ${appId}`, `---`];
  for (const { step } of section.steps) {
    const cmd = stepYaml(step);
    if (cmd) lines.push(cmd);
    const dwellMs =
      step.type === "wait" ? step.dwellMs : (step.dwellMs ?? 1200);
    lines.push(dwellYaml(Math.max(120, dwellMs)));
  }
  return lines.join("\n") + "\n";
}

// ── Recorders ─────────────────────────────────────────────────────

// Annulation (console Échap → la route SIGTERM ce runner) : SIGINT
// les recorders actifs pour finaliser leur container avant de sortir,
// sinon simctl/screenrecord continuent d'enregistrer orphelins.
const activeRecorders = new Set<ReturnType<typeof spawn>>();
const onKill = (): void => {
  for (const p of activeRecorders) {
    try {
      p.kill("SIGINT");
    } catch {}
  }
  process.exit(143);
};
process.on("SIGTERM", onKill);
process.on("SIGINT", onKill);

interface Recorder {
  /** Epoch ms du VRAI début d'enregistrement. Pour simctl c'est le
   *  message "Recording started" sur stderr — vérifié : le premier
   *  frame du média a PTS 0 à cet instant précis. Le spawn n'est PAS
   *  fiable (simctl met parfois plusieurs secondes à s'amorcer). */
  started: Promise<number>;
  /** Resolves once the recording file is finalized on disk, with the
   *  epoch ms of the SIGINT — the recording's true END time. */
  stop: () => Promise<number>;
  rawPath: string;
}

function startIosRecorder(workDir: string, sectionIdx: number): Recorder {
  const rawPath = join(workDir, `raw-${sectionIdx}.mov`);
  const udid = device ?? "booted";
  const proc = spawn(
    "xcrun",
    ["simctl", "io", udid, "recordVideo", "--codec=h264", "--force", rawPath],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  activeRecorders.add(proc);
  proc.on("exit", () => activeRecorders.delete(proc));
  let stderrBuf = "";
  const started = new Promise<number>((resolve) => {
    let done = false;
    const finish = (): void => {
      if (!done) {
        done = true;
        resolve(Date.now());
      }
    };
    proc.stderr?.on("data", (d) => {
      stderrBuf += String(d);
      if (stderrBuf.includes("Recording started")) finish();
    });
    // Garde-fou : certaines versions de simctl n'impriment rien.
    setTimeout(finish, 8000);
  });
  return {
    rawPath,
    started,
    stop: () =>
      new Promise<number>((resolve, reject) => {
        const stoppedAtMs = Date.now();
        proc.on("exit", () => {
          if (!existsSync(rawPath)) {
            reject(
              new Error(
                `simctl recordVideo n'a rien écrit. stderr: ${stderrBuf.slice(0, 400)}`,
              ),
            );
          } else resolve(stoppedAtMs);
        });
        // SIGINT finalizes the .mov container.
        proc.kill("SIGINT");
      }),
  };
}

function startAndroidRecorder(workDir: string, sectionIdx: number): Recorder {
  const rawPath = join(workDir, `raw-${sectionIdx}.mp4`);
  const remote = `/sdcard/__webgen_section_${sectionIdx}.mp4`;
  const adbBase = device ? [ADB_BIN, "-s", device] : [ADB_BIN];
  const proc = spawn(
    adbBase[0],
    [...adbBase.slice(1), "shell", "screenrecord", "--bit-rate", "8000000", remote],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  activeRecorders.add(proc);
  proc.on("exit", () => activeRecorders.delete(proc));
  // screenrecord ne signale pas son démarrage — il s'amorce vite ;
  // 500ms de settle est une approximation correcte sur émulateur.
  const started = new Promise<number>((resolve) =>
    setTimeout(() => resolve(Date.now()), 500),
  );
  return {
    rawPath,
    started,
    stop: () =>
      new Promise<number>((resolve, reject) => {
        const stoppedAtMs = Date.now();
        proc.on("exit", () => {
          // screenrecord needs a beat to finalize the moov atom.
          setTimeout(() => {
            const pull = spawnSync(
              adbBase[0],
              [...adbBase.slice(1), "pull", remote, rawPath],
              { stdio: "inherit" },
            );
            spawnSync(adbBase[0], [...adbBase.slice(1), "shell", "rm", remote]);
            if (pull.status !== 0 || !existsSync(rawPath)) {
              reject(new Error("adb pull du screenrecord a échoué"));
            } else resolve(stoppedAtMs);
          }, 1200);
        });
        // SIGINT on the screenrecord process (via its shell).
        spawnSync(adbBase[0], [
          ...adbBase.slice(1),
          "shell",
          "pkill",
          "-2",
          "screenrecord",
        ]);
      }),
  };
}

// ── Maestro run + log-derived step timings ────────────────────────

interface FlowRunResult {
  exitCode: number;
  /** Time-of-day ms (horloge locale) du début du DWELL de chaque
   *  step (l'assert `__webgen_dwell_*` qui suit chaque action —
   *  exactement un par step → indexes alignés 1:1 avec
   *  section.steps). Null quand le log Maestro n'est pas parseable.
   *  Conversion en temps vidéo : le caller soustrait le t0 réel de
   *  l'enregistrement (stop − durée média). */
  dwellStartsMsOfDay: number[] | null;
  flowStartMsOfDay: number | null;
}

function runMaestroFlow(flowPath: string, debugDir: string): FlowRunResult {
  const args: string[] = [];
  if (device) args.push("--device", device);
  args.push("test", "--debug-output", debugDir, flowPath);
  const r = spawnSync(MAESTRO_BIN, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
    env: MAESTRO_ENV,
    timeout: 10 * 60 * 1000,
  });
  if (r.stdout) process.stdout.write(indent(r.stdout));
  if (r.status !== 0 && r.stderr) process.stderr.write(indent(r.stderr));

  // Best-effort parse of the maestro.log written into debugDir : every
  // command logs a "<desc> RUNNING" line stamped HH:MM:SS.mmm (time of
  // day, no date).
  let dwellStartsMsOfDay: number[] | null = null;
  let flowStartMsOfDay: number | null = null;
  try {
    const logPath = findMaestroLog(debugDir);
    if (logPath) {
      const parsed = parseMaestroLog(readFileSync(logPath, "utf-8"));
      if (parsed.length > 0) {
        flowStartMsOfDay = parsed[0].msOfDay;
        const dwells = parsed.filter((p) => p.isDwell);
        if (dwells.length > 0) dwellStartsMsOfDay = dwells.map((p) => p.msOfDay);
      }
    }
  } catch {
    /* estimation fallback downstream */
  }
  return { exitCode: r.status ?? 1, dwellStartsMsOfDay, flowStartMsOfDay };
}

function msOfDay(epochMs: number): number {
  const d = new Date(epochMs);
  return (
    d.getHours() * 3_600_000 +
    d.getMinutes() * 60_000 +
    d.getSeconds() * 1000 +
    d.getMilliseconds()
  );
}

/** Maestro nests its artifacts under
 *  `<debugDir>/.maestro/tests/<timestamp>/maestro.log` — walk down
 *  to find the newest one. */
function findMaestroLog(debugDir: string): string | null {
  let best: { path: string; mtime: number } | null = null;
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const f of entries) {
      const p = join(dir, f);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p, depth + 1);
      else if (f === "maestro.log" && (!best || st.mtimeMs > best.mtime)) {
        best = { path: p, mtime: st.mtimeMs };
      }
    }
  };
  walk(debugDir, 0);
  return best ? (best as { path: string }).path : null;
}

/** Extract the time-of-day of every command start. Format observed
 *  (Maestro 2.x) :
 *  `11:32:26.880 [ INFO] maestro.cli.runner.MaestroCommandRunner...: Launch app "x" RUNNING`
 *  Meta-commands (Define variables / Apply configuration) are
 *  skipped. The `__webgen_dwell_*` asserts are kept and FLAGGED —
 *  one per step, their start = the step's action settled = the
 *  step's dwell window opens. */
function parseMaestroLog(
  content: string,
): Array<{ msOfDay: number; desc: string; isDwell: boolean }> {
  const out: Array<{ msOfDay: number; desc: string; isDwell: boolean }> = [];
  for (const line of content.split("\n")) {
    const m = line.match(
      /^(\d{2}):(\d{2}):(\d{2})[.:](\d{1,3})\s.*MaestroCommandRunner[^:]*:\s+(.+?)\s+RUNNING\s*$/,
    );
    if (!m) continue;
    const desc = m[5];
    if (/^(Define variables|Apply configuration)/.test(desc)) continue;
    out.push({
      msOfDay:
        parseInt(m[1], 10) * 3_600_000 +
        parseInt(m[2], 10) * 60_000 +
        parseInt(m[3], 10) * 1000 +
        parseInt(m[4].padEnd(3, "0"), 10),
      desc,
      isDwell: /__webgen_dwell_/.test(desc),
    });
  }
  return out;
}

function indent(s: string): string {
  return s
    .split("\n")
    .map((l) => (l ? `    ${l}` : l))
    .join("\n");
}

// ── ffmpeg normalize ──────────────────────────────────────────────

/** Simulator/device recordings are VFR with odd dimensions — Remotion
 *  (and the rest of the pipeline) expects CFR h264 yuv420p. Keep the
 *  native aspect (the device frame crops via objectFit) ; just clamp
 *  dimensions to even values and resample to the target fps.
 *  `headTrimSec` drops the idle JVM-startup head when known. */
function normalizeMp4(
  rawPath: string,
  outPath: string,
  headTrimSec: number,
  /** Durée utile à garder après le head trim — coupe la traîne
   *  (teardown Maestro + latence d'arrêt du recorder). 0 = tout. */
  keepSec: number,
): void {
  // ⚠ VFR clairsemé : PAS de -ss input (un seek qui tombe dans un
  // trou sans frame REBASE sur le frame suivant et mange le gap).
  // On densifie d'abord (fps=30 duplique depuis PTS 0), PUIS on
  // trimme en filtre, et tpad clone le dernier frame pour la traîne
  // statique (un VFR n'émet aucun frame quand l'écran est figé).
  const filters = [
    `fps=${fps}`,
    ...(headTrimSec > 0.05
      ? [`trim=start=${headTrimSec.toFixed(3)}`, `setpts=PTS-STARTPTS`]
      : []),
    `tpad=stop_mode=clone:stop_duration=30`,
    `scale=trunc(iw/2)*2:trunc(ih/2)*2`,
  ];
  const args = [
    "-y",
    "-i", rawPath,
    "-vf", filters.join(","),
    ...(keepSec > 0 ? ["-t", keepSec.toFixed(3)] : []),
    "-an",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outPath,
  ];
  const ff = spawnSync(FFMPEG_BIN, args, { stdio: ["ignore", "ignore", "pipe"], encoding: "utf-8" });
  if (ff.status !== 0) {
    console.error(`FFmpeg normalize failed (exit ${ff.status}): ${(ff.stderr ?? "").slice(-400)}`);
    process.exit(1);
  }
}

function probeDims(path: string): { width: number; height: number; durationSec: number } {
  const FFPROBE_BIN = process.env.WEBGEN_FFPROBE_BIN || "ffprobe";
  const r = spawnSync(
    FFPROBE_BIN,
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json",
      path,
    ],
    { encoding: "utf-8" },
  );
  try {
    const j = JSON.parse(r.stdout ?? "{}");
    return {
      width: j.streams?.[0]?.width ?? 0,
      height: j.streams?.[0]?.height ?? 0,
      durationSec: parseFloat(j.format?.duration ?? "0") || 0,
    };
  } catch {
    return { width: 0, height: 0, durationSec: 0 };
  }
}

// ── Main ──────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main(): Promise<void> {
  // Préflight : outils présents ?
  const maestroOk = spawnSync(MAESTRO_BIN, ["--version"], {
    encoding: "utf-8",
    env: MAESTRO_ENV,
  });
  if (maestroOk.status !== 0) {
    console.error(
      `Maestro introuvable. Installe-le depuis l'app (onglet Capture → « Installer les outils mobiles »), ou manuellement : brew install mobile-dev-inc/tap/maestro`,
    );
    process.exit(1);
  }
  if (platform === "android") {
    const adbOk = spawnSync(ADB_BIN, ["version"], { encoding: "utf-8" });
    if (adbOk.status !== 0) {
      console.error("adb introuvable — installe les Android platform-tools.");
      process.exit(1);
    }
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const workDir = join(tmpdir(), `webgen-mobile-${tourId}`);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  const sections = planSections(tour!);
  const format = tour!.format ?? "9:16";

  console.log(`▶ Tour mobile: ${tour!.name} (${sections.length} section(s) · ${platform})`);
  console.log(`  App       : ${appId}`);
  console.log(`  Device    : ${device ?? (platform === "ios" ? "booted" : "premier device adb")}`);
  console.log(`  Maestro   : ${(maestroOk.stdout ?? "").trim()}`);
  console.log(`  Out dir   : ${outDir}`);
  console.log("");

  const manifestSections: Array<{
    index: number;
    categoryId: string;
    title: string;
    subtitle?: string;
    file: string;
    durationSec: number;
    sizeBytes: number;
    frames: number;
    contentStartSec: number;
    stepTimings: StepTiming[];
    /** Splash à rendre côté Remotion (pas de DOM à injecter en natif). */
    postSplashSec?: number;
  }> = [];

  let width = 0;
  let height = 0;
  let totalFrames = 0;

  for (const section of sections) {
    console.log(
      `━ Section ${section.index}/${sections.length} · ${section.category.label} · "${section.title}"`,
    );
    const flowPath = join(workDir, `section-${section.index}.yaml`);
    writeFileSync(flowPath, buildSectionFlow(section));
    const debugDir = join(workDir, `debug-${section.index}`);
    mkdirSync(debugDir, { recursive: true });

    const recorder =
      platform === "ios"
        ? startIosRecorder(workDir, section.index)
        : startAndroidRecorder(workDir, section.index);
    // Attend le VRAI début d'enregistrement (message "Recording
    // started" de simctl) — son timestamp est le t0 vidéo : vérifié,
    // le premier frame du média a PTS 0 à cet instant.
    const recStartedMs = await recorder.started;

    const run = runMaestroFlow(flowPath, debugDir);
    if (run.exitCode !== 0) {
      await recorder.stop().catch(() => {});
      console.error(`  ✗ Maestro a échoué sur la section ${section.index} (exit ${run.exitCode}) — flow: ${flowPath}`);
      process.exit(1);
    }
    const stoppedAtMs = await recorder.stop();

    // Temps vidéo = temps mur depuis recStartedMs. Les trous VFR de
    // recordVideo (écran statique → pas de frames) sont comblés par
    // fps=30 (duplication) et la traîne statique par tpad (clone du
    // dernier frame) borné par -t keepSec.
    const realT0MsOfDay = msOfDay(recStartedMs);
    const relSec = (m: number): number => {
      let d = m - realT0MsOfDay;
      if (d < -43_200_000) d += 86_400_000; // wrap minuit
      return d / 1000;
    };
    const flowStartSec =
      run.flowStartMsOfDay !== null ? relSec(run.flowStartMsOfDay) : null;
    const dwellRelSec = run.dwellStartsMsOfDay?.map(relSec) ?? null;

    // Tronque la tête morte (démarrage JVM) si on a pu la mesurer,
    // et la traîne après le dernier dwell (teardown Maestro).
    const headTrimSec =
      flowStartSec !== null ? Math.max(0, flowStartSec - 0.2) : 0;
    let keepSec = (stoppedAtMs - recStartedMs) / 1000 - headTrimSec;
    if (dwellRelSec && dwellRelSec.length === section.steps.length) {
      const lastIdx = section.steps.length - 1;
      const lastStep = section.steps[lastIdx].step;
      const lastDwellSec =
        (lastStep.type === "wait" ? lastStep.dwellMs : (lastStep.dwellMs ?? 1200)) / 1000;
      keepSec = dwellRelSec[lastIdx] - headTrimSec + lastDwellSec + 0.25;
    }

    const outPath = join(outDir, section.outFile);
    normalizeMp4(recorder.rawPath, outPath, headTrimSec, keepSec);
    rmSync(recorder.rawPath, { force: true });

    const dims = probeDims(outPath);
    width = Math.max(width, dims.width);
    height = Math.max(height, dims.height);

    // stepTimings — chaque step émet exactement UN dwell assert dans
    // le flow, donc dwellStartsMs[k] ↔ section.steps[k]. Fallback :
    // estimation budget (1s d'action + dwell par step).
    const postSplashSec = section.splashDwellMs / 1000;
    const timings: StepTiming[] = [];
    let cursor = postSplashSec;
    for (const [k, { step, linearIdx }] of section.steps.entries()) {
      const dwellMs = step.type === "wait" ? step.dwellMs : (step.dwellMs ?? 1200);
      const parsedSec = dwellRelSec?.[k];
      const fromLog =
        parsedSec !== undefined
          ? parsedSec - headTrimSec + postSplashSec
          : null;
      const dwellStartSec = fromLog ?? cursor + 1.0;
      timings.push({
        linearIdx,
        type: step.type,
        dwellStartSec: Math.round(dwellStartSec * 1000) / 1000,
        dwellSec: dwellMs / 1000,
        ...(fromLog === null ? { estimated: true } : {}),
      });
      cursor = dwellStartSec + dwellMs / 1000;
    }

    const durationSec = dims.durationSec + postSplashSec;
    const frames = Math.round(dims.durationSec * fps);
    manifestSections.push({
      index: section.index,
      categoryId: section.category.id,
      title: section.title,
      subtitle: section.subtitle,
      file: section.outFile,
      durationSec: Math.round(durationSec * 100) / 100,
      sizeBytes: statSync(outPath).size,
      frames,
      contentStartSec: Math.round(postSplashSec * 1000) / 1000,
      stepTimings: timings,
      ...(postSplashSec > 0 ? { postSplashSec } : {}),
    });
    totalFrames += frames + Math.round(postSplashSec * fps);
    console.log(
      `  ✓ ${section.outFile} · ${durationSec.toFixed(1)}s (${dwellRelSec ? "timings log" : "timings estimés"})`,
    );
  }

  const manifest = {
    tourId,
    platform,
    format,
    width,
    height,
    fps,
    sections: manifestSections,
    totalFrames,
    totalDurationSec:
      Math.round(manifestSections.reduce((a, s) => a + s.durationSec, 0) * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  rmSync(workDir, { recursive: true, force: true });
  console.log("");
  console.log(
    `✓ Done · ${sections.length} clip(s) · ${manifest.totalDurationSec.toFixed(1)}s · ${manifestPath}`,
  );
}
