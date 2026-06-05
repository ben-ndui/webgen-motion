#!/usr/bin/env node
/**
 * Compose runner — Remotion-based. Reads the manifest produced by
 * the capture, derives Tour composition props (sections, brand,
 * audio mix, style preset, beats / VO pauses analysis), then
 * spawns `npx remotion render` to produce final.mp4.
 *
 * The legacy Puppeteer compositor was removed as part of the
 * chunk-7 cutover ; the rest of the pipeline (capture, audio) is
 * unchanged.
 *
 *   --tour-id <id>            required
 *   --tour-dir <path>         required ; contains manifest.json
 *   --bg-music <path>         optional
 *   --bg-music-volume <0-2>   optional, default 0.18
 *   --vo-volume <0-2>         optional, default 1.0
 *   --enable-pacing-trim      opt-in ; chunk-4.5 will reintroduce
 *                             lossless trim once VO silenceremove
 *                             is plumbed
 */

import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeDurationInFrames,
  type AudioBeat,
  type ManifestSection,
  type TourCompositionProps,
  type VoPause,
} from "../remotion/lib/types";
import { getTour } from "../src/lib/tour-loader";
import { isFeatureEnabled } from "../src/lib/edition";
import type { Hotspot, TourStep } from "../src/lib/types/tour";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

/** Path to the ffprobe binary. Set by the Tauri Rust shell to the
 *  bundled sidecar in packaged builds ; falls back to whatever's on
 *  PATH in dev (`brew install ffmpeg` provides ffprobe too). */
const FFPROBE_BIN = process.env.WEBGEN_FFPROBE_BIN || "ffprobe";

/** ffprobe a media file and return its duration in seconds. Returns 0
 *  on any failure — caller falls back to the manifest value. */
function probeMediaDurationSec(absPath: string): number {
  const r = spawnSync(
    FFPROBE_BIN,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absPath,
    ],
    { encoding: "utf-8" },
  );
  if (r.status !== 0) return 0;
  const sec = parseFloat((r.stdout ?? "").trim());
  return Number.isFinite(sec) ? sec : 0;
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
    /** Optional trim in/out points stored from the UI trim controls
     *  (Sprint UX post-capture · Phase 3). Both are in seconds,
     *  relative to the MP4 start. If absent, the full MP4 plays. */
    trimStartSec?: number;
    trimEndSec?: number;
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

  // Sprint 15.A — charger le tour pour propager les hotspots définis
  // dans `steps[]` (type "section") vers les ManifestSection envoyés
  // à Remotion. Le manifest sur disk ne porte pas les hotspots ; ils
  // vivent dans le tour JSON versionné, donc on lit le tour ici et
  // on matche la i-ème section du manifest avec la i-ème step
  // "section" du tour.
  const hotspotTour = getTour(tourId!);
  const hotspotSectionSteps = (hotspotTour?.steps ?? []).filter(
    (st): st is Extract<TourStep, { type: "section" }> =>
      st.type === "section",
  );
  // manifest `s.index` is 1-based; hotspotSectionSteps is 0-based.
  const hotspotsFor = (sectionIndex: number): Hotspot[] | undefined =>
    hotspotSectionSteps[sectionIndex - 1]?.hotspots;

  // Section MP4s — names preserved from manifest, but we re-probe
  // each file's actual duration with ffprobe and clamp the manifest
  // value to that. A manifest entry claiming "8s" against a 5s MP4
  // would make Remotion's OffthreadVideo extend past the media end
  // and display black for the residual frames. Better to play the
  // real media length and let the transition window shrink with it.
  const sections: ManifestSection[] = manifest.sections.map((s) => {
    const absPath = resolve(tourDir!, s.file);
    linkInto(absPath, s.file);
    const probedSec = probeMediaDurationSec(absPath);
    const captured =
      probedSec > 0 ? Math.min(s.durationSec, probedSec) : s.durationSec;
    if (probedSec > 0 && Math.abs(probedSec - s.durationSec) > 0.05) {
      console.log(
        `  ⚠ section ${s.index} : manifest ${s.durationSec.toFixed(2)}s vs media ${probedSec.toFixed(2)}s — using ${captured.toFixed(2)}s`,
      );
    }
    // Trim values written by the UI (Sprint UX phase 3). Clamp to
    // [0, captured] to be tolerant of stale values when the user
    // recaptured a section after setting trim.
    const trimStart = Math.max(0, Math.min(s.trimStartSec ?? 0, captured));
    const trimEnd = Math.max(
      trimStart + 0.1,
      Math.min(s.trimEndSec ?? captured, captured),
    );
    const effectiveSec = trimEnd - trimStart;
    if (trimStart > 0 || trimEnd < captured) {
      console.log(
        `  ✂ section ${s.index} trim : ${trimStart.toFixed(2)}s → ${trimEnd.toFixed(2)}s (was ${captured.toFixed(2)}s)`,
      );
    }
    return {
      index: s.index,
      categoryId: s.categoryId,
      title: s.title,
      subtitle: s.subtitle,
      fileName: s.file,
      durationSec: effectiveSec,
      capturedDurationSec: captured,
      startFromSec: trimStart > 0 ? trimStart : undefined,
      hotspots: hotspotsFor(s.index),
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
  // Resolve tsx via its canonical CLI script instead of `.bin/tsx`.
  // The `.bin/` shims are symlinks whose self-resolution
  // (`import.meta.url` based) breaks inside a packaged .app, where
  // `.bin/tsx` is a hardlink-copy that no longer sees its sibling
  // dist files. Going through `node_modules/tsx/dist/cli.mjs`
  // directly is portable to both dev and bundled contexts.
  const tsxCli = resolve(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const analyzeArgs = [
    tsxCli,
    "scripts/analyze-audio.ts",
    "--tour-id",
    tourId!,
    "--tour-dir",
    tourDir!,
  ];
  if (resolvedBgMusicPath) {
    analyzeArgs.push("--bg-music", resolvedBgMusicPath);
  }
  const analyze = spawnSync(process.execPath, analyzeArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (analyze.status !== 0) {
    console.warn("  ⚠ analyze-audio exited non-zero ; continuing without trim");
  }

  // Pacing trim is currently disabled by default — trimming a section
  // visually without also cutting the matching silence inside the VO
  // mp3 leaves the VO desynchronized for every subsequent section
  // (audio keeps playing past the visual cut → black frames with
  // voice continuing).
  //
  // Chunk 4.5 will reintroduce the trim alongside an ffmpeg
  // silenceremove pass on voiceover.mp3 so the audio shrinks by the
  // same amount, keeping markers and visuals aligned.
  //
  // Opt-in via --enable-pacing-trim for experimentation ; the
  // audio-analysis.json file is still produced for chunk 5 (beats /
  // pauses driving visual sync).
  const enablePacingTrim = process.argv.includes("--enable-pacing-trim");
  let trimSummary = enablePacingTrim
    ? "no trim (analysis empty)"
    : "skipped (re-enable with --enable-pacing-trim once VO sync is plumbed)";
  if (enablePacingTrim) {
    const audioAnalysisPath = join(tourDir!, "audio-analysis.json");
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
  }
  console.log(`  Pacing trim : ${trimSummary}`);

  // Surface beats + pauses into the composition props so chunk-5
  // visual sync (transitions + pulses) can read them at render time.
  let bgBeats: AudioBeat[] = [];
  let voPauses: VoPause[] = [];
  const audioAnalysisPath2 = join(tourDir!, "audio-analysis.json");
  if (existsSync(audioAnalysisPath2)) {
    try {
      const a = JSON.parse(readFileSync(audioAnalysisPath2, "utf-8")) as {
        bgBeats?: AudioBeat[];
        voPauses?: VoPause[];
      };
      bgBeats = a.bgBeats ?? [];
      voPauses = a.voPauses ?? [];
    } catch {}
  }

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

  // Sprint 7 — frame3d gated par feature flag (Studio Edition).
  // Si le tour demande un device 3D MAIS qu'on est en Community,
  // on strip silencieusement → fallback sur le 2D Mac chrome /
  // iPhone frame classique. L'edition est lue côté process Node
  // ici, donc le check se fait avant le spawn Remotion (pas de
  // dépendance browser sur process.env côté SectionPlayer).
  const frame3dEnabled = isFeatureEnabled("frames-3d");
  const frame3d =
    frame3dEnabled &&
    (tour?.frame3d === "iphone" || tour?.frame3d === "macbook")
      ? tour.frame3d
      : undefined;
  const cameraPreset3d =
    frame3d && typeof tour?.cameraPreset3d === "string"
      ? tour.cameraPreset3d
      : undefined;
  if (tour?.frame3d && !frame3dEnabled) {
    console.warn(
      `  ⚠ frame3d=${tour.frame3d} demandé mais Community Edition → fallback 2D. Active Studio via WEBGEN_MOTION_EDITION=studio dans .env.local et restart le dev server.`,
    );
  }

  // GLB loader optionnel — si le user a drop un modèle Sketchfab
  // dans public/models/<frame3d>.glb, on prend ce GLB à la place
  // du device procédural. Convention de naming : iphone.glb /
  // macbook.glb. Le GLB est stagé dans .remotion-public/models/
  // pour que staticFile() le résolve via le bundler Remotion.
  let frame3dGlbPath: string | undefined;
  if (frame3d) {
    const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const glbCandidate = join(repoRoot, "public", "models", `${frame3d}.glb`);
    if (existsSync(glbCandidate)) {
      mkdirSync(join(stagingDir, "models"), { recursive: true });
      linkInto(glbCandidate, `models/${frame3d}.glb`);
      frame3dGlbPath = `models/${frame3d}.glb`;
      console.log(`  ✓ GLB détecté → ${frame3dGlbPath} (override du procédural)`);
    } else {
      console.log(
        `  ℹ Pas de GLB dans public/models/${frame3d}.glb → fallback procédural. Drop un modèle Sketchfab pour upgrade.`,
      );
    }
  }

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
    bgBeats,
    voPauses,
    composeStyle:
      typeof tour?.composeStyle === "string" && tour.composeStyle.length > 0
        ? tour.composeStyle
        : "energetic",
    ...(frame3d ? { frame3d } : {}),
    ...(cameraPreset3d ? { cameraPreset3d } : {}),
    ...(frame3dGlbPath ? { frame3dGlbPath } : {}),
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

  // Same logic as the tsx spawn above : the `.bin/remotion` shim
  // does `require('./dist/index')` relative to its own location and
  // fails when the symlink-resolved path isn't `@remotion/cli/`.
  // Going through the canonical CLI script bypasses that.
  const remotionCli = resolve(
    process.cwd(),
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js",
  );
  const remotionArgs = [
    remotionCli,
    "render",
    compositionId,
    outPath,
    "--props",
    propsArg,
    "--public-dir",
    stagingDir,
    "--concurrency",
    "4",
    // Sprint 7 — quand frame3d est actif, WebGL est requis pour
    // Three.js. Chromium headless de Remotion ne crée pas de
    // context WebGL par défaut → on force "angle" (Almost Native
    // GL Layer Engine) qui utilise SwiftShader software renderer
    // si pas de GPU dispo. Aucun impact négatif sur les composes
    // 2D (juste un peu plus de RAM côté Chromium).
    "--gl",
    frame3d ? "angle" : "swangle",
    "--log",
    "info",
  ];

  const proc = spawn(process.execPath, remotionArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, NO_COLOR: "1" },
  });

  proc.on("error", (err) => {
    console.error(`Spawn failed: ${err.message}`);
    process.exit(1);
  });

  void probeMediaDurationSec;

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
