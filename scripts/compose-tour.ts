#!/usr/bin/env node
/**
 * Compose runner. Re-films the React compose page
 * (`/compose/<tourId>?autoplay=1`) to produce a
 * single final MP4 from all the section clips.
 *
 * Why two passes? The per-section runner (`capture-tour.ts`) gives us
 * raw clean recordings of each scene. This pass wraps them in a Mac
 * browser chrome with category-colored backdrops + crossfade
 * transitions between sections — pure CSS/Framer animations are
 * easier to iterate on than ffmpeg compositing.
 *
 * The compose page sets `window.__motionComposeDone = true` when
 * the sequence finishes. The runner polls for this and stops
 * capturing.
 *
 * Output: `<tourDir>/final.mp4` next to the section clips and the
 * manifest.
 *
 * Usage:
 *   npx tsx scripts/compose-tour.ts \
 *     --tour-id deploys \
 *     --base-url http://localhost:3000 \
 *     --width 1920 --height 1080 \
 *     --fps 30 \
 *     --tour-dir /tmp/uzme-motion-tours/deploys
 */

import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import puppeteer from "puppeteer";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const tourId = arg("--tour-id");
const baseUrl = (arg("--base-url", "http://localhost:3000") ?? "").replace(/\/$/, "");
// Width/height are now read from the manifest by default so the
// compose viewport matches the captured format. CLI flags can still
// override for debugging.
const widthArg = arg("--width");
const heightArg = arg("--height");
const fps = parseInt(arg("--fps", "30") ?? "30", 10);
const tourDir = arg("--tour-dir");
// Optional bg music absolute path. Mixed at volume=0.18 with a fade-in
// on the first 0.6s and a fade-out anchored to the video's last 1.0s.
// Auto-ducked to 0.10 when --voiceover is also present.
const bgMusicPath = arg("--bg-music");
// Optional voiceover track (typically <tourDir>/voiceover.mp3 produced
// by audio-tour.ts). Mixed at --vo-volume (default 1.0).
const voiceoverPath = arg("--voiceover");
// Manual volume overrides. Defaults to:
//   - bg music = 0.18 (or 0.10 if VO is also present, auto-ducked)
//   - vo       = 1.0
const bgMusicVolumeArg = arg("--bg-music-volume");
const voVolumeArg = arg("--vo-volume");

if (!tourId) {
  console.error("Missing --tour-id");
  process.exit(1);
}
if (!tourDir || !existsSync(join(tourDir, "manifest.json"))) {
  console.error(`Missing --tour-dir or manifest.json not found: ${tourDir}`);
  process.exit(1);
}
if (bgMusicPath && !existsSync(bgMusicPath)) {
  console.error(`Bg music file not found: ${bgMusicPath}`);
  process.exit(1);
}
if (voiceoverPath && !existsSync(voiceoverPath)) {
  console.error(`Voiceover file not found: ${voiceoverPath}`);
  process.exit(1);
}

const outPath = join(tourDir, "final.mp4");
const framesDir = join("/tmp", `tour-compose-frames-${tourId}`);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main(): Promise<void> {
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  // Read the manifest to figure out what format / dimensions we
  // need to compose at. Defaults to 16:9 / 1920×1080 if older
  // manifests don't carry these fields.
  interface Manifest {
    format?: "16:9" | "9:16";
    width?: number;
    height?: number;
  }
  const manifest = JSON.parse(
    readFileSync(join(tourDir!, "manifest.json"), "utf-8"),
  ) as Manifest;
  const format = manifest.format ?? "16:9";
  const isPortrait = format === "9:16";
  const width = parseInt(widthArg ?? String(manifest.width ?? (isPortrait ? 1080 : 1920)), 10);
  const height = parseInt(heightArg ?? String(manifest.height ?? (isPortrait ? 1920 : 1080)), 10);

  const composeUrl = `${baseUrl}/compose/${encodeURIComponent(tourId)}?autoplay=1`;

  console.log(`▶ Compose: ${tourId} (${format})`);
  console.log(`  Stage URL: ${composeUrl}`);
  console.log(`  Viewport:  ${width}×${height} @ ${fps}fps`);
  console.log(`  Output:    ${outPath}`);
  console.log("");

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
      "--hide-scrollbars",
      // Required so the <video autoplay> tags inside the compose page
      // start without a user gesture.
      "--autoplay-policy=no-user-gesture-required",
    ],
    defaultViewport: { width, height, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();

  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error" || t === "warning" || msg.text().startsWith("[motion]")) {
      console.log(`  [page:${t}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    console.log(`  [page:error] ${err.message}`);
  });

  // __name shim — see capture-tour.ts for context. The compose page
  // is React-rendered so the app bundle won't trigger this; it's a
  // safety net for any inline scripts we might add later.
  await page.evaluateOnNewDocument(
    "window.__name = window.__name || function(fn) { return fn; };",
  );

  await page.goto(composeUrl, {
    waitUntil: "networkidle2",
    timeout: 30_000,
  });

  // Wait for the page to load the manifest + react has the first
  // section ready.
  await page.waitForFunction(
    () => {
      // Either the intro card is visible or a video element exists.
      return (
        !!document.querySelector("video") ||
        !!document.querySelector("button")
      );
    },
    { timeout: 15_000 },
  );

  // Frame capture loop: capture as fast as page.screenshot allows
  // (~10–18fps in practice on macOS). The HTML5 <video> elements
  // inside the page play at their natural speed in wall-clock time,
  // so we encode at the *actual* achieved fps to keep the MP4
  // duration aligned with what the viewer would see live. Encoding
  // at a fixed 30fps would compress the playback ~2× because we
  // never deliver enough frames per real-time second.
  let frameIdx = 0;
  const startMs = Date.now();
  const hardCapMs = 5 * 60 * 1000;

  console.log(`  ▶ Capturing frames (target ${fps}fps, actual rate depends on host)…`);
  while (Date.now() - startMs < hardCapMs) {
    const filename = join(framesDir, String(frameIdx).padStart(6, "0") + ".jpg");
    await page.screenshot({
      path: filename as `${string}.jpg`,
      type: "jpeg",
      quality: 88,
    });
    frameIdx++;
    if (frameIdx % 60 === 0) {
      const sec = ((Date.now() - startMs) / 1000).toFixed(1);
      console.log(`    ${frameIdx} frames · ${sec}s elapsed`);
    }
    const done = await page.evaluate(
      () =>
        (window as unknown as { __motionComposeDone?: boolean })
          .__motionComposeDone === true,
    );
    if (done) {
      // 30 extra screenshots so the outro fade-in lands on the
      // composed timeline.
      for (let i = 0; i < 30; i++) {
        const f = join(framesDir, String(frameIdx).padStart(6, "0") + ".jpg");
        await page.screenshot({
          path: f as `${string}.jpg`,
          type: "jpeg",
          quality: 88,
        });
        frameIdx++;
      }
      break;
    }
  }
  const captureEndMs = Date.now();
  const elapsedSec = (captureEndMs - startMs) / 1000;
  const actualFps = Math.max(1, frameIdx / elapsedSec);

  await browser.close();

  console.log("");
  console.log(
    `▶ ${frameIdx} frames in ${elapsedSec.toFixed(1)}s · actual ${actualFps.toFixed(2)}fps → encoding final MP4…`,
  );
  if (bgMusicPath) console.log(`  ▶ Mixing bg music: ${bgMusicPath}`);
  if (voiceoverPath) console.log(`  ▶ Mixing voice-over: ${voiceoverPath}`);

  // Compute the encoded video duration so the bg music fade-out
  // lands ~1s before the end. The output fps is `fps` and we re-time
  // the source images to it via the `fps` filter.
  const videoSec = frameIdx / actualFps;
  const fadeOutAt = Math.max(0.4, videoSec - 1.0);

  // Build the ffmpeg argv. We have four mix scenarios:
  //   - no audio
  //   - bg music only         → music at 0.18 with fades
  //   - voiceover only        → vo at 1.0
  //   - bg music + voiceover  → vo at 1.0, music ducked to 0.10
  //                             with fades, amix=inputs=2
  // The video pass is identical across all scenarios.
  const ffArgs: string[] = ["-y"];
  ffArgs.push(
    "-framerate",
    actualFps.toFixed(3),
    "-i",
    join(framesDir, "%06d.jpg"),
  );

  // Audio input indices: video=0, bg=1 if present, vo follows.
  let audioInputCount = 0;
  if (bgMusicPath) {
    ffArgs.push("-stream_loop", "-1", "-i", bgMusicPath);
    audioInputCount++;
  }
  if (voiceoverPath) {
    ffArgs.push("-i", voiceoverPath);
    audioInputCount++;
  }

  ffArgs.push(
    "-vf",
    `fps=${fps}`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
  );

  if (audioInputCount > 0) {
    // Resolve effective volumes. CLI overrides win. Defaults:
    //   - bg alone:        0.18
    //   - bg + VO:         bg auto-ducked to 0.10 (UI can override)
    //   - VO alone or both: VO at 1.0
    const bgVol = clamp(parseFloatOr(bgMusicVolumeArg, voiceoverPath ? 0.10 : 0.18), 0, 2);
    const voVol = clamp(parseFloatOr(voVolumeArg, 1.0), 0, 2);
    let filter: string;
    let mapAudio: string;
    if (bgMusicPath && voiceoverPath) {
      filter =
        `[1:a]volume=${bgVol.toFixed(3)},afade=t=in:st=0:d=0.6,afade=t=out:st=${fadeOutAt.toFixed(2)}:d=1.0[bg];` +
        `[2:a]volume=${voVol.toFixed(3)}[vo];` +
        `[bg][vo]amix=inputs=2:duration=first:dropout_transition=0[a]`;
      mapAudio = "[a]";
    } else if (bgMusicPath) {
      filter = `[1:a]volume=${bgVol.toFixed(3)},afade=t=in:st=0:d=0.6,afade=t=out:st=${fadeOutAt.toFixed(2)}:d=1.0[a]`;
      mapAudio = "[a]";
    } else {
      filter = `[1:a]volume=${voVol.toFixed(3)}[a]`;
      mapAudio = "[a]";
    }
    console.log(`  ▶ Audio mix: bg=${bgVol.toFixed(2)} vo=${voVol.toFixed(2)}`);
    ffArgs.push(
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-filter_complex",
      filter,
      "-map",
      "0:v",
      "-map",
      mapAudio,
      "-shortest",
    );
  }
  ffArgs.push("-movflags", "+faststart", outPath);

  const ff = spawnSync("ffmpeg", ffArgs, { stdio: "inherit" });
  if (ff.status !== 0) {
    console.error(`FFmpeg failed (exit ${ff.status})`);
    process.exit(1);
  }

  rmSync(framesDir, { recursive: true, force: true });
  console.log(`✓ Done → ${outPath}`);
}

function parseFloatOr(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
