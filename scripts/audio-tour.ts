#!/usr/bin/env node
/**
 * Voice-over generator. Walks the tour catalogue step-by-step,
 * generates a TTS clip for each step that carries a `voiceover`
 * (or override) text via ElevenLabs, and assembles a single
 * timeline-aligned `voiceover.mp3` track that mirrors the visual
 * timing of the section MP4s.
 *
 * Two timing modes per section:
 *   - **Section-level VO**: the section step itself has `voiceover`.
 *     One TTS clip plays from t=0 of the section, padded/truncated
 *     to fit the section duration. Best for flowing narration.
 *   - **Per-step VO**: section step has no voiceover but one or more
 *     overlay/scroll/wait/hover steps inside it do. Each step's VO
 *     plays in its own time slot (cum dwell from section start).
 *     Best for punchy beats synced to specific visuals.
 *
 * Caching: every TTS call is keyed by sha1(voiceId|model|text) so
 * identical lines across runs / sections are reused. Stored in
 * `~/.webgen-motion/vo-cache/` as `<hash>.mp3` + `<hash>.alignment.json`
 * (character-level timings from the ElevenLabs `/with-timestamps`
 * endpoint, kept side by side so future runs reuse them without
 * re-querying).
 *
 * Phonetic respelling (e.g. UZME → Youzmi) is applied via
 * `applyPronunciation` BEFORE hashing + sending to the API.
 *
 * Per-step audio fades:
 *   - 80ms fade-in (avoids click on chunk boundaries)
 *   - 250ms fade-out anchored to step end
 *
 * Env:
 *   ELEVENLABS_API_KEY   — required
 *   ELEVENLABS_VOICE_ID  — required
 *   ELEVENLABS_MODEL     — optional, defaults to eleven_multilingual_v2
 *
 * Args:
 *   --tour-id <id>            — required
 *   --tour-dir <path>         — required, contains manifest.json
 *   --overrides <json-path>   — optional JSON file mapping step linear
 *                               indices (string keys, 0-based) to
 *                               text overrides; "" disables a step's VO
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getTour } from "../src/lib/tour-loader";
import type { TourStep } from "../src/lib/types/tour";
import { applyPronunciation } from "../src/lib/pronunciation";
import { getVoCacheDir } from "../src/lib/motion-tour-store";

/**
 * Character-level alignment returned by ElevenLabs
 * `/with-timestamps`. Indices in the three arrays are aligned : the
 * Nth character starts at `character_start_times_seconds[N]` and ends
 * at `character_end_times_seconds[N]`. Whitespace + punctuation are
 * included as their own characters.
 */
interface ElevenLabsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const tourId = arg("--tour-id");
const tourDir = arg("--tour-dir");
const overridesPath = arg("--overrides");

if (!tourId) {
  console.error("Missing --tour-id");
  process.exit(1);
}
if (!tourDir || !existsSync(join(tourDir, "manifest.json"))) {
  console.error(`Missing --tour-dir or manifest.json not found: ${tourDir}`);
  process.exit(1);
}

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;
const modelId = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";

if (!apiKey) {
  console.error("ELEVENLABS_API_KEY not set in env");
  process.exit(1);
}
if (!voiceId) {
  console.error("ELEVENLABS_VOICE_ID not set in env");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

interface ManifestSection {
  index: number;
  title: string;
  durationSec: number;
}

async function main(): Promise<void> {
  const tour = getTour(tourId!);
  if (!tour) {
    console.error(`Tour not found in catalogue: ${tourId}`);
    process.exit(1);
  }

  const manifest = JSON.parse(
    readFileSync(join(tourDir!, "manifest.json"), "utf-8"),
  ) as { sections: ManifestSection[]; fps: number };

  // Load overrides — keyed by linear step index in tour.steps. Empty
  // string disables VO for that step (forces silence even if catalogue
  // has voiceover defined).
  const overrides: Record<string, string> = overridesPath && existsSync(overridesPath)
    ? JSON.parse(readFileSync(overridesPath, "utf-8"))
    : {};

  const cacheDir = getVoCacheDir();
  mkdirSync(cacheDir, { recursive: true });

  const workDir = join(tourDir!, ".vo-work");
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  console.log(`▶ VO: ${tour.name}`);
  console.log(`  Voice ID: ${voiceId}`);
  console.log(`  Model:    ${modelId}`);
  if (Object.keys(overrides).length > 0) {
    console.log(`  Overrides: ${Object.keys(overrides).length} step(s)`);
  }

  // Walk tour.steps, partition into sections. Each section keeps its
  // member steps in catalogue order. The section ALSO carries its own
  // index for the manifest match-up.
  interface PlannedStep {
    /** Linear index in tour.steps (used as override key) */
    linearIdx: number;
    step: TourStep;
    /** Effective dwell ms for this step's audio slot */
    dwellMs: number;
    /** Effective voiceover text after applying overrides; undefined
     *  = no VO, render silence */
    voiceover: string | undefined;
  }
  interface PlannedSection {
    sectionIdx: number; // 1-based, matches manifest
    splash: PlannedStep | null; // the "section" step itself (carrying splash dwell)
    body: PlannedStep[]; // non-section steps until the next section
    durationSec: number; // from manifest
  }

  const plans: PlannedSection[] = [];
  let current: PlannedSection | null = null;
  for (let i = 0; i < tour.steps.length; i++) {
    const step = tour.steps[i];
    const overrideRaw = Object.prototype.hasOwnProperty.call(overrides, String(i))
      ? overrides[String(i)]
      : undefined;
    const baseVo: string | undefined =
      step.type === "section" ||
      step.type === "overlay" ||
      step.type === "scroll" ||
      step.type === "wait" ||
      step.type === "hover"
        ? step.voiceover
        : undefined;
    const effectiveVo: string | undefined =
      overrideRaw === undefined
        ? baseVo
        : overrideRaw === ""
          ? undefined
          : overrideRaw;
    const dwellMs =
      step.type === "wait"
        ? step.dwellMs
        : step.type === "section"
          ? step.dwellMs ?? 2000
          : step.dwellMs ?? 1200;

    const planned: PlannedStep = {
      linearIdx: i,
      step,
      dwellMs,
      voiceover: effectiveVo,
    };

    if (step.type === "section") {
      const idx = plans.length + 1;
      const m = manifest.sections[idx - 1];
      current = {
        sectionIdx: idx,
        splash: planned,
        body: [],
        durationSec: m?.durationSec ?? 0,
      };
      plans.push(current);
    } else {
      if (!current) {
        // Synthetic default section for tours without explicit "section" markers.
        const m = manifest.sections[0];
        current = {
          sectionIdx: 1,
          splash: null,
          body: [],
          durationSec: m?.durationSec ?? 0,
        };
        plans.push(current);
      }
      current.body.push(planned);
    }
  }

  console.log(`  Sections: ${plans.length}`);

  const sectionTracks: string[] = [];

  // Tracks per-step audio offsets in the FINAL voiceover.mp3 timeline
  // (cumulative across sections). Each item records the slot a step
  // occupies so the UI / future narrative-mode logic can correlate
  // overlay timing to the actual character-level alignment from
  // ElevenLabs without re-querying.
  type AlignmentItemKind =
    | "section-vo"
    | "step-vo"
    | "section-silence"
    | "splash-silence"
    | "step-silence";
  interface AlignmentItem {
    linearStepIdx: number | null;
    sectionIdx: number;
    kind: AlignmentItemKind;
    text: string | null;
    /** Audio offset (seconds) within voiceover.mp3 where this slot starts. */
    audioStartSec: number;
    /** Slot duration. End = start + duration. */
    audioDurationSec: number;
    /** Character-level alignment (only present when kind ends in `-vo`). */
    alignment: ElevenLabsAlignment | null;
    normalizedAlignment: ElevenLabsAlignment | null;
  }
  const alignmentItems: AlignmentItem[] = [];
  let timelineCursorSec = 0;

  for (const sec of plans) {
    const sectionMp3 = join(
      workDir,
      `section-${String(sec.sectionIdx).padStart(2, "0")}.mp3`,
    );

    // Section-level VO short-circuits per-step assembly: one TTS clip
    // for the whole section duration.
    const sectionLevelVo = sec.splash?.voiceover;
    const stepLevelVoCount = sec.body.filter((p) => !!p.voiceover).length;

    if (sectionLevelVo) {
      console.log(
        `  [${sec.sectionIdx}/${plans.length}] section-level VO (${sec.durationSec.toFixed(1)}s)`,
      );
      const tts = await ensureTts(sectionLevelVo, cacheDir);
      runFfmpeg(buildPadArgs(tts.mp3Path, sectionMp3, sec.durationSec, /* fadeIn */ 0.08));
      alignmentItems.push({
        linearStepIdx: sec.splash?.linearIdx ?? null,
        sectionIdx: sec.sectionIdx,
        kind: "section-vo",
        text: sectionLevelVo,
        audioStartSec: timelineCursorSec,
        audioDurationSec: sec.durationSec,
        alignment: tts.alignment,
        normalizedAlignment: tts.normalizedAlignment,
      });
      timelineCursorSec += sec.durationSec;
      sectionTracks.push(sectionMp3);
      continue;
    }

    if (stepLevelVoCount === 0) {
      // No VO anywhere in this section → pure silence.
      console.log(`  [${sec.sectionIdx}/${plans.length}] silence (${sec.durationSec.toFixed(1)}s)`);
      runFfmpeg([
        "-y",
        "-f", "lavfi",
        "-i", "anullsrc=r=44100:cl=stereo",
        "-t", sec.durationSec.toFixed(3),
        "-c:a", "libmp3lame",
        "-b:a", "128k",
        sectionMp3,
      ]);
      alignmentItems.push({
        linearStepIdx: sec.splash?.linearIdx ?? null,
        sectionIdx: sec.sectionIdx,
        kind: "section-silence",
        text: null,
        audioStartSec: timelineCursorSec,
        audioDurationSec: sec.durationSec,
        alignment: null,
        normalizedAlignment: null,
      });
      timelineCursorSec += sec.durationSec;
      sectionTracks.push(sectionMp3);
      continue;
    }

    // Per-step assembly: each body step gets its own audio chunk
    // matching its dwellMs. Splash gets silence (no VO at section
    // level). Concat them in order.
    console.log(
      `  [${sec.sectionIdx}/${plans.length}] per-step VO (${stepLevelVoCount} step(s))`,
    );

    const stepChunks: string[] = [];

    if (sec.splash) {
      const splashMp3 = join(
        workDir,
        `s${sec.sectionIdx}-splash.mp3`,
      );
      const splashSec = sec.splash.dwellMs / 1000;
      runFfmpeg([
        "-y",
        "-f", "lavfi",
        "-i", "anullsrc=r=44100:cl=stereo",
        "-t", splashSec.toFixed(3),
        "-c:a", "libmp3lame",
        "-b:a", "128k",
        splashMp3,
      ]);
      alignmentItems.push({
        linearStepIdx: sec.splash.linearIdx,
        sectionIdx: sec.sectionIdx,
        kind: "splash-silence",
        text: null,
        audioStartSec: timelineCursorSec,
        audioDurationSec: splashSec,
        alignment: null,
        normalizedAlignment: null,
      });
      timelineCursorSec += splashSec;
      stepChunks.push(splashMp3);
    }

    for (const p of sec.body) {
      const stepMp3 = join(
        workDir,
        `s${sec.sectionIdx}-step${String(p.linearIdx).padStart(3, "0")}.mp3`,
      );
      const stepSec = p.dwellMs / 1000;

      if (p.voiceover) {
        const preview =
          p.voiceover.slice(0, 50) + (p.voiceover.length > 50 ? "…" : "");
        console.log(`      step ${p.linearIdx} · "${preview}"`);
        const tts = await ensureTts(p.voiceover, cacheDir);
        runFfmpeg(buildPadArgs(tts.mp3Path, stepMp3, stepSec, /* fadeIn */ 0.08));
        alignmentItems.push({
          linearStepIdx: p.linearIdx,
          sectionIdx: sec.sectionIdx,
          kind: "step-vo",
          text: p.voiceover,
          audioStartSec: timelineCursorSec,
          audioDurationSec: stepSec,
          alignment: tts.alignment,
          normalizedAlignment: tts.normalizedAlignment,
        });
      } else {
        runFfmpeg([
          "-y",
          "-f", "lavfi",
          "-i", "anullsrc=r=44100:cl=stereo",
          "-t", stepSec.toFixed(3),
          "-c:a", "libmp3lame",
          "-b:a", "128k",
          stepMp3,
        ]);
        alignmentItems.push({
          linearStepIdx: p.linearIdx,
          sectionIdx: sec.sectionIdx,
          kind: "step-silence",
          text: null,
          audioStartSec: timelineCursorSec,
          audioDurationSec: stepSec,
          alignment: null,
          normalizedAlignment: null,
        });
      }
      timelineCursorSec += stepSec;
      stepChunks.push(stepMp3);
    }

    // Concat the section's step chunks into one section file.
    const stepConcat = join(workDir, `s${sec.sectionIdx}-concat.txt`);
    writeFileSync(
      stepConcat,
      stepChunks.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
    );
    runFfmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", stepConcat,
      "-c", "copy",
      sectionMp3,
    ]);
    sectionTracks.push(sectionMp3);
  }

  // Concat all sections into the final timeline track. We add no
  // crossfade — each section already has fades on its own contents.
  const concatList = join(workDir, "concat.txt");
  writeFileSync(
    concatList,
    sectionTracks.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
  );

  const outPath = join(tourDir!, "voiceover.mp3");
  console.log(`▶ Concat → ${outPath}`);
  runFfmpeg([
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatList,
    "-c", "copy",
    outPath,
  ]);

  // Companion alignment file: cumulative offsets per step + the
  // original ElevenLabs character timings (per VO clip, RELATIVE to
  // the clip's start, not the global timeline). Future "narrative
  // continuous" mode will use this to derive overlay timings.
  const alignPath = join(tourDir!, "voiceover-alignment.json");
  writeFileSync(
    alignPath,
    JSON.stringify(
      {
        tourId,
        voiceId,
        modelId,
        totalDurationSec: timelineCursorSec,
        items: alignmentItems,
      },
      null,
      2,
    ),
  );
  console.log(`✓ Alignment → ${alignPath}`);

  rmSync(workDir, { recursive: true, force: true });
  console.log(`✓ Done → ${outPath}`);
}

interface TtsArtifact {
  mp3Path: string;
  /** Native ElevenLabs alignment (character-level). */
  alignment: ElevenLabsAlignment | null;
  /** Same shape but applied AFTER text normalization (digit→words…). */
  normalizedAlignment: ElevenLabsAlignment | null;
}

/**
 * Generate or fetch from cache the TTS audio for `text`, returns
 * the path to the cached MP3 PLUS the character-level alignment from
 * ElevenLabs. Phonetic substitutions (UZME→Youzmi) are applied before
 * hashing + sending to the API.
 *
 * Cache layout per text:
 *   <hash>.mp3                — the audio binary
 *   <hash>.alignment.json     — { alignment, normalizedAlignment }
 *
 * Both are written atomically; if one is missing on read we re-query
 * to keep them in sync.
 */
async function ensureTts(text: string, cacheDir: string): Promise<TtsArtifact> {
  const phonetic = applyPronunciation(text);
  const hash = createHash("sha1")
    .update(`${voiceId}|${modelId}|${phonetic}`)
    .digest("hex")
    .slice(0, 16);
  const mp3Path = join(cacheDir, `${hash}.mp3`);
  const alignPath = join(cacheDir, `${hash}.alignment.json`);
  if (existsSync(mp3Path) && existsSync(alignPath)) {
    const cached = JSON.parse(readFileSync(alignPath, "utf-8")) as {
      alignment: ElevenLabsAlignment | null;
      normalizedAlignment: ElevenLabsAlignment | null;
    };
    return {
      mp3Path,
      alignment: cached.alignment,
      normalizedAlignment: cached.normalizedAlignment,
    };
  }
  console.log(`      TTS → "${phonetic.slice(0, 60)}${phonetic.length > 60 ? "…" : ""}"`);
  const fetched = await fetchElevenLabsTts(phonetic, voiceId!, modelId, apiKey!);
  writeFileSync(mp3Path, fetched.audio);
  writeFileSync(
    alignPath,
    JSON.stringify(
      {
        alignment: fetched.alignment,
        normalizedAlignment: fetched.normalizedAlignment,
      },
      null,
      2,
    ),
  );
  return {
    mp3Path,
    alignment: fetched.alignment,
    normalizedAlignment: fetched.normalizedAlignment,
  };
}

/**
 * Build ffmpeg args that pad/truncate `inputMp3` to `targetSec`,
 * apply a fade-in and fade-out, and write to `outputMp3`. The
 * resulting file is exactly `targetSec` long, with the speech
 * starting at t=fadeInSec.
 */
function buildPadArgs(
  inputMp3: string,
  outputMp3: string,
  targetSec: number,
  fadeInSec: number,
): string[] {
  const fadeOutDur = 0.25;
  const fadeOutAt = Math.max(0.05, targetSec - fadeOutDur);
  return [
    "-y",
    "-i", inputMp3,
    "-af",
    `apad,atrim=0:${targetSec.toFixed(3)},afade=t=in:st=0:d=${fadeInSec.toFixed(3)},afade=t=out:st=${fadeOutAt.toFixed(3)}:d=${fadeOutDur.toFixed(3)}`,
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    outputMp3,
  ];
}

interface FetchedTts {
  audio: Buffer;
  alignment: ElevenLabsAlignment | null;
  normalizedAlignment: ElevenLabsAlignment | null;
}

async function fetchElevenLabsTts(
  text: string,
  voiceId: string,
  modelId: string,
  apiKey: string,
): Promise<FetchedTts> {
  // `/with-timestamps` returns JSON { audio_base64, alignment,
  // normalized_alignment } instead of the raw MP3 binary. Same body
  // shape as the standard endpoint, just a different content type.
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "<no body>");
    throw new Error(
      `ElevenLabs TTS failed (${res.status}): ${errText.slice(0, 500)}`,
    );
  }
  const json = (await res.json()) as {
    audio_base64?: string;
    alignment?: ElevenLabsAlignment | null;
    normalized_alignment?: ElevenLabsAlignment | null;
  };
  if (!json.audio_base64) {
    throw new Error(`ElevenLabs response missing audio_base64`);
  }
  const audio = Buffer.from(json.audio_base64, "base64");
  if (audio.byteLength < 1024) {
    throw new Error(`ElevenLabs returned suspiciously small payload (${audio.byteLength} bytes)`);
  }
  return {
    audio,
    alignment: json.alignment ?? null,
    normalizedAlignment: json.normalized_alignment ?? null,
  };
}

function runFfmpeg(args: string[]): void {
  const r = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed: ${args.join(" ")}`);
  }
}
