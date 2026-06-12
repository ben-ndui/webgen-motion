#!/usr/bin/env node
/**
 * Audio analyzer for the level-3 compose pipeline.
 *
 * Three outputs, all collapsed into `<tourDir>/audio-analysis.json` :
 *
 * 1. VO pauses     — silencedetect on voiceover.mp3 finds the gaps
 *                    (no speech for ≥150ms below -25dB). Used by the
 *                    composition to schedule visual "breaths" between
 *                    overlays.
 *
 * 2. BG music beats — RMS envelope sampled at 50ms intervals, then
 *                    peak-picked. Tracks the rhythm so chunk 5 can
 *                    snap cuts onto the strongest beats inside a
 *                    transition window.
 *
 * 3. Per-section pacing — for each section reads voiceover-alignment.json
 *                    and computes the spoken-active duration that
 *                    falls within the section's [startSec, endSec]
 *                    window. If that duration is meaningfully shorter
 *                    than the captured MP4 duration we flag the
 *                    section for trim (the composition will read the
 *                    `audioActiveSec` field and shorten the time
 *                    window + cap OffthreadVideo's endAt accordingly).
 *
 * Args :
 *   --tour-id <id>
 *   --tour-dir <path>
 *   --bg-music <path>        optional ; same resolution as compose runner
 *   --silence-db <-25>       optional, default -25
 *   --silence-min-sec <0.15> optional, default 0.15
 *   --trim-slack <0.85>      optional ; only trim when active/captured < this
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const tourId = arg("--tour-id");
const tourDir = arg("--tour-dir");
const bgMusicArg = arg("--bg-music");
const silenceDb = parseFloat(arg("--silence-db") ?? "-25");
const silenceMinSec = parseFloat(arg("--silence-min-sec") ?? "0.15");
const trimSlack = parseFloat(arg("--trim-slack") ?? "0.85");

if (!tourId) {
  console.error("Missing --tour-id");
  process.exit(1);
}
if (!tourDir || !existsSync(join(tourDir, "manifest.json"))) {
  console.error(`Missing --tour-dir or manifest.json not found: ${tourDir}`);
  process.exit(1);
}

interface VoPause {
  startSec: number;
  endSec: number;
  durationSec: number;
}

interface Beat {
  /** Time in seconds within the bg music track. */
  sec: number;
  /** Normalized strength 0..1 — relative to the loudest beat. */
  strength: number;
}

interface AlignmentItem {
  linearStepIdx: number | null;
  sectionIdx: number;
  kind: string;
  text: string | null;
  audioStartSec: number;
  audioDurationSec: number;
}

interface AlignmentFile {
  tourId: string;
  voiceMode?: string;
  totalDurationSec: number;
  items: AlignmentItem[];
}

interface SectionMeta {
  index: number;
  durationSec: number;
}

interface PacingPerSection {
  sectionIdx: number;
  capturedDurationSec: number;
  audioActiveSec: number;
  /** Suggested trimmed duration the composition can apply. Equal to
   *  capturedDurationSec when no trim is needed, otherwise = ceil
   *  audioActiveSec + tail padding. */
  trimmedDurationSec: number;
  trimRecommended: boolean;
}

function main(): void {
  const manifestPath = join(tourDir!, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    sections: SectionMeta[];
    totalDurationSec: number;
  };

  // ── 1. VO pauses ───────────────────────────────────────────────
  const voPath = join(tourDir!, "voiceover.mp3");
  let voPauses: VoPause[] = [];
  if (existsSync(voPath)) {
    voPauses = runSilenceDetect(voPath, silenceDb, silenceMinSec);
  }
  console.log(`  VO pauses: ${voPauses.length}`);

  // ── 2. BG music beats ──────────────────────────────────────────
  const bgPath = bgMusicArg && existsSync(bgMusicArg) ? resolve(bgMusicArg) : null;
  let bgBeats: Beat[] = [];
  if (bgPath) {
    bgBeats = sampleBeatsFromRms(bgPath);
  }
  console.log(`  BG beats : ${bgBeats.length}`);

  // ── 3. Per-section pacing ──────────────────────────────────────
  const alignmentPath = join(tourDir!, "voiceover-alignment.json");
  let alignment: AlignmentFile | null = null;
  if (existsSync(alignmentPath)) {
    try {
      alignment = JSON.parse(readFileSync(alignmentPath, "utf-8")) as AlignmentFile;
    } catch (e) {
      console.error(`  ⚠ couldn't parse alignment json: ${(e as Error).message}`);
    }
  }
  const pacing = computePacing(manifest.sections, alignment, trimSlack);
  const trimCount = pacing.filter((p) => p.trimRecommended).length;
  console.log(`  Pacing   : ${pacing.length} sections analyzed, ${trimCount} trim-suggested`);

  // Emit consolidated artifact.
  const outPath = join(tourDir!, "audio-analysis.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        tourId,
        voPauses,
        bgBeats,
        pacing,
        config: { silenceDb, silenceMinSec, trimSlack },
      },
      null,
      2,
    ),
  );
  console.log(`✓ ${outPath}`);
}

/** Path to the ffmpeg binary. In a packaged Tauri build the Rust
 *  shell sets WEBGEN_FFMPEG_BIN to the bundled sidecar ; in dev we
 *  fall back to whatever's on PATH (`brew install ffmpeg`). */
const FFMPEG_BIN = process.env.WEBGEN_FFMPEG_BIN || "ffmpeg";
const FFPROBE_BIN = process.env.WEBGEN_FFPROBE_BIN || "ffprobe";

function runFfmpeg(args: string[]): { stdout: string; stderr: string } {
  // maxBuffer bumped — the per-frame ametadata dump of a few minutes
  // of audio overflows the 1MB spawnSync default.
  const r = spawnSync(FFMPEG_BIN, args, {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function runFfprobe(args: string[]): string {
  const r = spawnSync(FFPROBE_BIN, args, { encoding: "utf-8" });
  return r.stdout ?? "";
}

function runSilenceDetect(
  mp3Path: string,
  noiseDb: number,
  minSec: number,
): VoPause[] {
  const { stderr } = runFfmpeg([
    "-hide_banner",
    "-nostats",
    "-i", mp3Path,
    "-af", `silencedetect=noise=${noiseDb}dB:duration=${minSec}`,
    "-f", "null",
    "-",
  ]);
  const lines = stderr.split("\n");
  const pauses: VoPause[] = [];
  let currentStart: number | null = null;
  for (const line of lines) {
    let m = line.match(/silence_start:\s*([\d.]+)/);
    if (m) {
      currentStart = parseFloat(m[1]);
      continue;
    }
    m = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);
    if (m && currentStart !== null) {
      pauses.push({
        startSec: currentStart,
        endSec: parseFloat(m[1]),
        durationSec: parseFloat(m[2]),
      });
      currentStart = null;
    }
  }
  return pauses;
}

/**
 * Sample-and-pick beat detection : reads the bg track via ffmpeg's
 * `astats` filter at 50ms-window granularity, collects RMS dB per
 * window, then runs a simple local-maxima pass with a minimum gap
 * (250ms) and a minimum prominence threshold. Not as precise as a
 * dedicated onset detector but good enough to sync visual cuts on
 * the music's stronger hits.
 */
function sampleBeatsFromRms(mp3Path: string): Beat[] {
  // ffmpeg outputs one RMS value per audio frame (~26ms at 44.1kHz),
  // plenty of granularity for cut snapping.
  const { stdout, stderr } = runFfmpeg([
    "-hide_banner",
    "-nostats",
    "-i", mp3Path,
    "-af",
    "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
    "-f", "null",
    "-",
  ]);
  // ametadata `file=-` writes "frame:N pts:T pts_time:T.T\n
  // lavfi.astats.Overall.RMS_level=-X.YZ" pairs to STDOUT (stderr
  // kept as fallback for older ffmpeg builds that logged there).
  // Parse them into [timeSec, rmsDb] tuples.
  const samples: Array<{ t: number; db: number }> = [];
  const lines = (stdout + "\n" + stderr).split("\n");
  let pendingTime: number | null = null;
  for (const line of lines) {
    let m = line.match(/pts_time:([\d.]+)/);
    if (m) {
      pendingTime = parseFloat(m[1]);
      continue;
    }
    m = line.match(/lavfi\.astats\.Overall\.RMS_level=(-?[\d.]+)/);
    if (m && pendingTime !== null) {
      samples.push({ t: pendingTime, db: parseFloat(m[1]) });
      pendingTime = null;
    }
  }
  if (samples.length === 0) return [];

  // Convert dB to linear amplitude, find local maxima with gap.
  const linear = samples.map((s) => Math.pow(10, s.db / 20));
  const maxLin = Math.max(...linear);
  if (maxLin === 0) return [];

  // Strength is normalized against the LOCAL loudness (±2s sliding
  // window), not the track's global max — a track with a quiet 30s
  // intro before the drop would otherwise yield zero beats over the
  // whole intro (where short tours actually live). The absolute dB
  // floor keeps true silence from producing phantom beats.
  const sampleDt =
    samples.length > 1
      ? (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1)
      : 0.026;
  const halfWin = Math.max(1, Math.round(2 / sampleDt));
  const minGapSec = 0.25;
  const minLocalStrength = 0.55; // 55% of the local loudest
  const minDb = -45; // absolute floor — below this it's silence
  const beats: Beat[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const prev = linear[i - 1];
    const cur = linear[i];
    const next = linear[i + 1];
    if (!(cur > prev && cur >= next)) continue;
    if (samples[i].db < minDb) continue;
    let localMax = 0;
    for (
      let j = Math.max(0, i - halfWin);
      j <= Math.min(samples.length - 1, i + halfWin);
      j++
    ) {
      if (linear[j] > localMax) localMax = linear[j];
    }
    if (localMax === 0) continue;
    const strength = cur / localMax;
    if (strength < minLocalStrength) continue;
    const candidate = samples[i].t;
    const last = beats[beats.length - 1];
    if (!last || candidate - last.sec >= minGapSec) {
      beats.push({
        sec: candidate,
        strength: Math.round(strength * 100) / 100,
      });
    }
  }
  return beats;
}

function computePacing(
  sections: SectionMeta[],
  alignment: AlignmentFile | null,
  slack: number,
): PacingPerSection[] {
  // sections live in manifest order ; we need their [startSec, endSec]
  // windows relative to the start of the timeline to intersect with
  // alignment items.
  let cursor = 0;
  const windows = sections.map((s) => {
    const window = { startSec: cursor, endSec: cursor + s.durationSec };
    cursor += s.durationSec;
    return window;
  });

  return sections.map((s, i) => {
    const window = windows[i];
    let audioActiveSec = 0;
    if (alignment?.items) {
      for (const it of alignment.items) {
        if (it.kind !== "narrative-step" && !it.kind?.endsWith("-vo")) continue;
        const start = it.audioStartSec;
        const end = it.audioStartSec + it.audioDurationSec;
        // Overlap with the section's window.
        const overlapStart = Math.max(start, window.startSec);
        const overlapEnd = Math.min(end, window.endSec);
        if (overlapEnd > overlapStart) {
          audioActiveSec += overlapEnd - overlapStart;
        }
      }
    }
    // If no alignment data at all, assume the section is fully active.
    if (!alignment) audioActiveSec = s.durationSec;

    const ratio = s.durationSec > 0 ? audioActiveSec / s.durationSec : 1;
    const trimRecommended = ratio < slack && audioActiveSec > 0.5;
    // Tail padding so the section doesn't end abruptly on the last
    // syllable — 0.3s breathing room.
    const trimmedDurationSec = trimRecommended
      ? Math.min(s.durationSec, audioActiveSec + 0.3)
      : s.durationSec;
    return {
      sectionIdx: s.index,
      capturedDurationSec: s.durationSec,
      audioActiveSec,
      trimmedDurationSec,
      trimRecommended,
    };
  });
}

// Silence lint warning : ffprobe import not used yet — keep the helper
// available for chunk 5 when we'll need exact bg music duration.
void runFfprobe;

// Invoked at module end so every top-level const (FFMPEG_BIN, parsed
// args, …) is initialized before main()'s closures dereference them.
// Calling it earlier hit a TDZ : "Cannot access 'FFMPEG_BIN' before
// initialization".
main();
