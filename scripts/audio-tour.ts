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
import type { TourEntry, TourStep } from "../src/lib/types/tour";
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

/** Effective ElevenLabs voice settings — tour override merged with defaults. */
interface EffectiveVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

const DEFAULT_VOICE_SETTINGS: EffectiveVoiceSettings = {
  stability: 0.55,
  similarityBoost: 0.78,
  style: 0.12,
  useSpeakerBoost: true,
};

/** Module-level reference populated once per run, used by fetchElevenLabsTts. */
let effectiveSettings: EffectiveVoiceSettings = DEFAULT_VOICE_SETTINGS;

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

  // Merge tour-level voice settings overrides on top of defaults.
  // Anything missing keeps the default value.
  const userSettings = tour.voiceSettings ?? {};
  effectiveSettings = {
    stability:
      typeof userSettings.stability === "number"
        ? userSettings.stability
        : DEFAULT_VOICE_SETTINGS.stability,
    similarityBoost:
      typeof userSettings.similarityBoost === "number"
        ? userSettings.similarityBoost
        : DEFAULT_VOICE_SETTINGS.similarityBoost,
    style:
      typeof userSettings.style === "number"
        ? userSettings.style
        : DEFAULT_VOICE_SETTINGS.style,
    useSpeakerBoost:
      typeof userSettings.useSpeakerBoost === "boolean"
        ? userSettings.useSpeakerBoost
        : DEFAULT_VOICE_SETTINGS.useSpeakerBoost,
  };

  console.log(`▶ VO: ${tour.name}`);
  console.log(`  Voice ID: ${voiceId}`);
  console.log(`  Model:    ${modelId}`);
  console.log(
    `  Settings: stability=${effectiveSettings.stability} similarity=${effectiveSettings.similarityBoost} style=${effectiveSettings.style} speaker_boost=${effectiveSettings.useSpeakerBoost}`,
  );
  if (Object.keys(overrides).length > 0) {
    console.log(`  Overrides: ${Object.keys(overrides).length} step(s)`);
  }

  // Narrative mode short-circuits per-step assembly: one continuous
  // narration for the whole tour, char-level timings drive the step
  // start times. Per-step `voiceover` fields are ignored.
  if (tour.voiceMode === "narrative") {
    if (!tour.narrativeScript || !tour.narrativeScript.trim()) {
      console.error(
        "voiceMode=narrative but narrativeScript is empty — nothing to synthesize",
      );
      process.exit(1);
    }
    await runNarrativeMode({
      tourDir: tourDir!,
      tourId: tourId!,
      tour,
      narrativeScript: tour.narrativeScript,
      cacheDir,
      workDir,
      manifest,
    });
    rmSync(workDir, { recursive: true, force: true });
    return;
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

/**
 * Strips `[step:N]` markers from the narrative script while remembering
 * the position of each marker in the resulting clean text. The clean
 * text is what we send to ElevenLabs; marker positions index into the
 * `alignment.characters` array returned by the API.
 *
 * Whitespace immediately around a marker is preserved as-is — the user
 * is expected to write natural prose with markers placed at sentence
 * boundaries.
 */
function parseNarrativeMarkers(script: string): {
  cleanText: string;
  markers: Array<{ stepIdx: number; charPosClean: number }>;
} {
  const markers: Array<{ stepIdx: number; charPosClean: number }> = [];
  let cleanText = "";
  const re = /\[step:(\d+)\]/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script)) !== null) {
    cleanText += script.slice(lastEnd, m.index);
    markers.push({
      stepIdx: parseInt(m[1], 10),
      charPosClean: cleanText.length,
    });
    lastEnd = m.index + m[0].length;
  }
  cleanText += script.slice(lastEnd);
  return { cleanText, markers };
}

interface NarrativeRunInput {
  tourDir: string;
  tourId: string;
  tour: TourEntry;
  narrativeScript: string;
  cacheDir: string;
  workDir: string;
  manifest: { sections: ManifestSection[] };
}

/**
 * Narrative mode runner. One ElevenLabs synthesis for the entire tour,
 * step start times derived from `[step:N]` markers in the script
 * mapped to character timestamps. Output:
 *   - `voiceover.mp3`              — re-encoded stereo
 *   - `voiceover-alignment.json`   — narrative items with stepIdx +
 *                                    audioStartSec, plus the raw
 *                                    character alignment from Eleven
 */
async function runNarrativeMode(input: NarrativeRunInput): Promise<void> {
  const { tourDir, tourId, tour, narrativeScript, cacheDir, workDir } = input;
  const { cleanText, markers } = parseNarrativeMarkers(narrativeScript);
  if (!cleanText.trim()) {
    throw new Error(
      "narrativeScript reduces to empty text after stripping markers",
    );
  }
  console.log(`▶ Narrative mode`);
  console.log(`  Markers: ${markers.length}`);
  console.log(`  Clean text length: ${cleanText.length} chars`);

  const tts = await ensureTts(cleanText, cacheDir);
  if (!tts.alignment) {
    throw new Error(
      "ElevenLabs returned no alignment — narrative mode requires /with-timestamps to provide character timings",
    );
  }

  // Re-encode the cached mono mp3 to stereo 44.1k so it matches the
  // layout used everywhere else (compose mux, future per-section
  // playback). No padding / fades — the narration is contiguous.
  const outPath = join(tourDir, "voiceover.mp3");
  runFfmpeg([
    "-y",
    "-i", tts.mp3Path,
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "-ac", "2",
    "-ar", "44100",
    outPath,
  ]);
  console.log(`✓ Audio → ${outPath}`);

  // The phonetic transformation (UZME→Youzmi) shifts character indices
  // because "UZME" (4 chars) becomes "Youzmi" (6 chars). We sent the
  // PHONETIC text to the API, so alignment.characters indexes the
  // phonetic string. The markers were extracted from the ORIGINAL
  // script, so their charPosClean indexes the un-phonetic text. Apply
  // the same transformation to the marker offsets.
  const phoneticCleanText = applyPronunciation(cleanText);
  const aligned = tts.alignment;
  const totalAudioSec =
    aligned.character_end_times_seconds[
      aligned.character_end_times_seconds.length - 1
    ] ?? 0;

  // For each marker, find its position in the phonetic text. The
  // pronunciation map is small + applied uniformly, so we re-run the
  // same transform on the prefix-up-to-marker to get the phonetic
  // offset, then look up its end time as the step start (so a step
  // appears just after the previous spoken character).
  const stepStarts: Array<{
    linearStepIdx: number;
    audioStartSec: number;
  }> = [];
  for (const m of markers) {
    const prefix = cleanText.slice(0, m.charPosClean);
    const phoneticPrefix = applyPronunciation(prefix);
    const idx = Math.min(
      phoneticPrefix.length,
      aligned.character_end_times_seconds.length - 1,
    );
    const tSec =
      idx <= 0
        ? 0
        : aligned.character_end_times_seconds[idx - 1] ?? 0;
    stepStarts.push({
      linearStepIdx: m.stepIdx,
      audioStartSec: tSec,
    });
  }

  // Compute durations as gap to next marker (or to end-of-audio for
  // the last one). Steps not referenced by a marker get null durations
  // — the UI / compose layer can decide how to fill those.
  const items = stepStarts.map((s, i) => {
    const next = stepStarts[i + 1];
    const audioDurationSec = next
      ? Math.max(0, next.audioStartSec - s.audioStartSec)
      : Math.max(0, totalAudioSec - s.audioStartSec);
    return {
      linearStepIdx: s.linearStepIdx,
      sectionIdx: -1, // not section-bound in narrative mode
      kind: "narrative-step" as const,
      text: null,
      audioStartSec: s.audioStartSec,
      audioDurationSec,
      alignment: null,
      normalizedAlignment: null,
    };
  });

  const alignPath = join(tourDir, "voiceover-alignment.json");
  writeFileSync(
    alignPath,
    JSON.stringify(
      {
        tourId,
        voiceId,
        modelId,
        voiceMode: "narrative",
        totalDurationSec: totalAudioSec,
        cleanText,
        phoneticCleanText,
        rawAlignment: aligned,
        normalizedAlignment: tts.normalizedAlignment,
        items,
      },
      null,
      2,
    ),
  );
  console.log(`✓ Alignment → ${alignPath}`);
  console.log(
    `  Total ${totalAudioSec.toFixed(2)}s · ${items.length} step start(s) derived`,
  );

  // Quiet warning if the user wrote markers referencing steps that
  // don't exist — easy off-by-one in the script.
  for (const s of stepStarts) {
    if (s.linearStepIdx < 0 || s.linearStepIdx >= tour.steps.length) {
      console.warn(
        `  ⚠ marker [step:${s.linearStepIdx}] is out of range (tour has ${tour.steps.length} steps)`,
      );
    }
  }
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
  // Cache key includes voice settings so changing the sliders busts
  // the cache rather than serving the old audio.
  const settingsKey = [
    effectiveSettings.stability.toFixed(3),
    effectiveSettings.similarityBoost.toFixed(3),
    effectiveSettings.style.toFixed(3),
    effectiveSettings.useSpeakerBoost ? "1" : "0",
  ].join(",");
  const hash = createHash("sha1")
    .update(`${voiceId}|${modelId}|${settingsKey}|${phonetic}`)
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
    // ElevenLabs returns mono mp3 but our silence chunks are
    // stereo (anullsrc cl=stereo). Forcing every VO chunk to
    // stereo keeps the channel layout uniform across the whole
    // timeline so `concat -c copy` doesn't produce a mid-file
    // layout switch (which most players abort on).
    "-ac", "2",
    "-ar", "44100",
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
        stability: effectiveSettings.stability,
        similarity_boost: effectiveSettings.similarityBoost,
        style: effectiveSettings.style,
        use_speaker_boost: effectiveSettings.useSpeakerBoost,
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
