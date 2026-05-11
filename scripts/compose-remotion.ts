#!/usr/bin/env node
/**
 * Remotion compose runner — replaces the Puppeteer-based
 * `compose-tour.ts` from level 1. Reads the manifest produced by
 * the capture, derives Tour composition props, then spawns
 * `npx remotion render` to produce final.mp4.
 *
 * Keeps the same input contract as the old runner so the API route
 * can spawn either pipeline depending on a feature flag during the
 * level-3 rollout :
 *
 *   --tour-id <id>            required
 *   --tour-dir <path>         required ; contains manifest.json
 *   --bg-music <path>         optional
 *   --bg-music-volume <0-2>   optional, default 0.18 (auto-ducked
 *                             to 0.10 by the ffmpeg post-pass when
 *                             a voiceover is present — not handled
 *                             here, the React composition mixes
 *                             linearly)
 *   --vo-volume <0-2>         optional, default 1.0
 */

import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  computeDurationInFrames,
  type ManifestSection,
  type TourCompositionProps,
} from "../remotion/lib/types";
import { getTour } from "../src/lib/tour-loader";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const tourId = arg("--tour-id");
const tourDir = arg("--tour-dir");
const bgMusicPathArg = arg("--bg-music");
const bgMusicVolumeArg = parseFloat(arg("--bg-music-volume") ?? "0.18");
const voVolumeArg = parseFloat(arg("--vo-volume") ?? "1.0");

if (!tourId) {
  console.error("Missing --tour-id");
  process.exit(1);
}
if (!tourDir || !existsSync(join(tourDir, "manifest.json"))) {
  console.error(`Missing --tour-dir or manifest.json not found: ${tourDir}`);
  process.exit(1);
}

interface ManifestRaw {
  tourId: string;
  width: number;
  height: number;
  fps: number;
  format?: "16:9" | "9:16";
  sections: Array<{
    index: number;
    categoryId: string;
    title: string;
    subtitle?: string;
    file: string;
    durationSec: number;
  }>;
  totalDurationSec: number;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main(): Promise<void> {
  const manifestPath = join(tourDir!, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as ManifestRaw;
  const fps = manifest.fps;
  const format = manifest.format ?? "16:9";

  // Remotion only serves assets via http:// from a publicDir — so we
  // build a single staging dir with symlinks to every file the
  // composition references (sections + voiceover + bg music). Files
  // already living inside tourDir are linked by their own name ;
  // files from outside (uploaded bg music) get a stable rename.
  const stagingDir = join(tourDir!, ".remotion-public");
  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });

  // Copy rather than symlink — Remotion's webpack-served public dir
  // doesn't follow symlinks once it's bundled into the temp build
  // location. Cost is one fs copy per file (cheap for ~MB MP4s).
  const linkInto = (absPath: string, asName: string): void => {
    const dest = join(stagingDir, asName);
    if (existsSync(dest)) rmSync(dest);
    copyFileSync(absPath, dest);
  };

  // Section MP4s — names preserved from manifest.
  const sections: ManifestSection[] = manifest.sections.map((s) => {
    linkInto(resolve(tourDir!, s.file), s.file);
    return {
      index: s.index,
      categoryId: s.categoryId,
      title: s.title,
      subtitle: s.subtitle,
      fileName: s.file,
      durationSec: s.durationSec,
      capturedDurationSec: s.durationSec,
    };
  });

  // Voiceover lives at <tourDir>/voiceover.mp3 by convention. Already
  // sitting in tourDir so the symlink is essentially a no-op rename.
  let voiceoverFile: string | null = null;
  const voPath = join(tourDir!, "voiceover.mp3");
  if (existsSync(voPath)) {
    linkInto(voPath, "voiceover.mp3");
    voiceoverFile = "voiceover.mp3";
  }

  // Bg music can come from --bg-music or from tour.bgMusic. Either way
  // we stage it under a stable name so the composition just asks for
  // "bg-music<ext>".
  let bgMusicFile: string | null = null;
  let resolvedBgMusicPath: string | null = null;
  if (bgMusicPathArg && existsSync(bgMusicPathArg)) {
    resolvedBgMusicPath = resolve(bgMusicPathArg);
  } else {
    const tour = getTour(tourId!);
    if (tour?.bgMusic) {
      const guess = resolve(process.cwd(), tour.bgMusic);
      if (existsSync(guess)) resolvedBgMusicPath = guess;
    }
  }
  if (resolvedBgMusicPath) {
    const ext = basename(resolvedBgMusicPath).split(".").pop() ?? "mp3";
    bgMusicFile = `bg-music.${ext}`;
    linkInto(resolvedBgMusicPath, bgMusicFile);
  }

  // ── Audio analysis : pacing trim + beats ──────────────────────
  // Spawn the analyzer synchronously so we can read its output and
  // shorten sections before kicking off the Remotion render. Chunk
  // 5 will consume the beats array directly from the composition.
  console.log(`▶ Audio analysis…`);
  const analyzeArgs = [
    "tsx",
    "scripts/analyze-audio.ts",
    "--tour-id",
    tourId!,
    "--tour-dir",
    tourDir!,
  ];
  if (resolvedBgMusicPath) {
    analyzeArgs.push("--bg-music", resolvedBgMusicPath);
  }
  const analyze = spawnSync("npx", analyzeArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (analyze.status !== 0) {
    console.warn("  ⚠ analyze-audio exited non-zero ; continuing without trim");
  }

  // Read the pacing decisions back and rewrite section durations.
  const audioAnalysisPath = join(tourDir!, "audio-analysis.json");
  let trimSummary = "no trim";
  if (existsSync(audioAnalysisPath)) {
    try {
      const analysis = JSON.parse(
        readFileSync(audioAnalysisPath, "utf-8"),
      ) as {
        pacing?: Array<{
          sectionIdx: number;
          trimmedDurationSec: number;
          trimRecommended: boolean;
        }>;
      };
      let savedSec = 0;
      let trimmed = 0;
      for (const s of sections) {
        const p = analysis.pacing?.find((x) => x.sectionIdx === s.index);
        if (p?.trimRecommended) {
          savedSec += s.durationSec - p.trimmedDurationSec;
          trimmed++;
          s.durationSec = p.trimmedDurationSec;
        }
      }
      if (trimmed > 0) {
        trimSummary = `${trimmed} section(s) trimmed, ${savedSec.toFixed(1)}s saved`;
      }
    } catch (e) {
      console.warn(
        `  ⚠ couldn't parse audio-analysis.json: ${(e as Error).message}`,
      );
    }
  }
  console.log(`  Pacing trim : ${trimSummary}`);

  // Brand info comes from the tour catalogue with sensible fallbacks.
  const tour = getTour(tourId!);
  const tourBaseUrl = tour?.baseUrl ?? "http://localhost:3000";
  let derivedDomain = "localhost";
  try {
    derivedDomain = new URL(tourBaseUrl).host;
  } catch {}
  const brand = {
    displayName:
      tour?.brand?.displayName ?? tour?.name ?? tourId!,
    domain: tour?.brand?.domain ?? derivedDomain,
    tagline:
      tour?.brand?.tagline ?? tour?.brand?.domain ?? derivedDomain,
  };

  const props: TourCompositionProps = {
    tourId: tourId!,
    format,
    fps,
    sections,
    brand,
    voiceoverFile,
    bgMusicFile,
    bgMusicVolume: bgMusicVolumeArg,
    voVolume: voVolumeArg,
  };

  const durationFrames = computeDurationInFrames(sections, fps);
  const compositionId = format === "9:16" ? "tour-9x16" : "tour-16x9";
  const outPath = join(tourDir!, "final.mp4");

  console.log(`▶ Remotion compose : ${tourId}`);
  console.log(`  Composition : ${compositionId}`);
  console.log(`  Sections    : ${sections.length} (${manifest.totalDurationSec.toFixed(1)}s)`);
  console.log(`  Duration    : ${durationFrames} frames @ ${fps}fps`);
  console.log(`  Voice-over  : ${voiceoverFile ?? "—"}`);
  console.log(`  Bg music    : ${bgMusicFile ?? "—"}`);
  console.log(`  Public dir  : ${stagingDir}`);
  console.log(`  Output      : ${outPath}`);

  const propsArg = JSON.stringify(props);

  const remotionArgs = [
    "remotion",
    "render",
    compositionId,
    outPath,
    "--props",
    propsArg,
    "--public-dir",
    stagingDir,
    "--concurrency",
    "4",
    "--log",
    "info",
  ];

  const proc = spawn("npx", remotionArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, NO_COLOR: "1" },
  });

  proc.on("error", (err) => {
    console.error(`Spawn failed: ${err.message}`);
    process.exit(1);
  });

  proc.on("close", (code) => {
    // Cleanup the staging dir whatever the outcome ; symlinks aren't
    // expensive to recreate, and leaving them around clutters tourDir.
    rmSync(stagingDir, { recursive: true, force: true });
    if (code !== 0) {
      console.error(`Remotion render exited with code ${code}`);
      process.exit(code ?? 1);
    }
    if (!existsSync(outPath)) {
      console.error("Remotion render finished but final.mp4 is missing");
      process.exit(1);
    }
    console.log(`✓ Done → ${outPath}`);
  });
}
