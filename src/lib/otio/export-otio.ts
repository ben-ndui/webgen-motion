/**
 * Sprint E — assembleur de l'export OTIO (Studio Edition).
 *
 * Lit les artefacts du tour (`manifest.json` + `edit-plan.json` s'il
 * existe), résout les chemins médias absolus, sonde les durées via
 * ffprobe, et écrit `<tourDir>/<tourId>.otio` via le builder pur
 * (build-otio.ts). Utilisé par la route API
 * `/api/motion/tour/export/otio` ET le CLI `scripts/export-otio.ts`.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildOtioTimeline,
  type OtioVideoClipInput,
  type OtioVoSegmentInput,
} from "./build-otio";

const FFPROBE_BIN = process.env.WEBGEN_FFPROBE_BIN || "ffprobe";

/** Durée d'un média en secondes — null si ffprobe échoue. */
function probeDurationSec(absPath: string): number | null {
  const r = spawnSync(
    FFPROBE_BIN,
    [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      absPath,
    ],
    { encoding: "utf-8" },
  );
  if (r.status !== 0) return null;
  const sec = parseFloat((r.stdout ?? "").trim());
  return Number.isFinite(sec) ? sec : null;
}

interface ManifestFile {
  tourId: string;
  fps: number;
  sections: Array<{
    index: number;
    title: string;
    file: string;
    durationSec: number;
    trimStartSec?: number;
    trimEndSec?: number;
    postSplashSec?: number;
  }>;
}

interface EditPlanFile {
  sections?: Array<{
    index: number;
    playDurationSec: number;
    extendTailSec?: number;
    snappedBeat: { sec: number } | null;
  }>;
  voSegments?: OtioVoSegmentInput[];
  bgMusicPath?: string | null;
}

/** Miroir de remotion/lib/types TRANSITIONS — dupliqué ici pour ne
 *  pas tirer le bundle Remotion dans une route Next. À garder en
 *  phase si les holds intro/outro changent. */
const INTRO_HOLD_SEC = 2.2;
const OUTRO_HOLD_SEC = 2.2;

export interface OtioExportResult {
  otioPath: string;
  sections: number;
  voSegments: number;
  hasMusic: boolean;
  timelineName: string;
}

export function exportTourOtio(opts: {
  tourId: string;
  tourDir: string;
  tourName?: string;
  /** Override du chemin musique — sinon celui du dernier compose
   *  (edit-plan.json), sinon pas de piste musique. */
  bgMusicPath?: string | null;
}): OtioExportResult {
  const { tourId, tourDir } = opts;
  const manifestPath = join(tourDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(
      `manifest.json introuvable dans ${tourDir} — lance une capture d'abord.`,
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as ManifestFile;

  let plan: EditPlanFile | null = null;
  const planPath = join(tourDir, "edit-plan.json");
  if (existsSync(planPath)) {
    try {
      plan = JSON.parse(readFileSync(planPath, "utf-8")) as EditPlanFile;
    } catch {
      plan = null;
    }
  }

  // ── Clips vidéo depuis le manifest (+ décisions edit plan) ──────
  const videoClips: OtioVideoClipInput[] = manifest.sections.map((s) => {
    const mediaPathAbs = resolve(tourDir, s.file);
    const mediaDurationSec = probeDurationSec(mediaPathAbs);
    const postSplashSec = s.postSplashSec ?? 0;
    const srcInSec = Math.max(0, s.trimStartSec ?? 0);
    const p = plan?.sections?.find((x) => x.index === s.index);
    // playDurationSec inclut le splash virtuel ET l'éventuel freeze
    // (extend-to-fit) ; côté média on retire les deux. Fallback sans
    // plan : durée UI-trimmée du manifest.
    const uiTrimmed =
      (s.trimEndSec ?? s.durationSec) - srcInSec;
    const playSec = p?.playDurationSec ?? uiTrimmed;
    const extendTailSec = p?.extendTailSec ?? 0;
    return {
      name: `S${s.index} — ${s.title}`,
      mediaPathAbs,
      srcInSec,
      durationSec: Math.max(0.1, playSec - postSplashSec - extendTailSec),
      postSplashSec,
      extendTailSec,
      mediaDurationSec,
      snappedBeatSec: p?.snappedBeat?.sec ?? null,
    };
  });

  // ── Voix off ─────────────────────────────────────────────────────
  const voPath = join(tourDir, "voiceover.mp3");
  const voiceoverPathAbs = existsSync(voPath) ? voPath : null;
  const voiceoverDurationSec = voiceoverPathAbs
    ? probeDurationSec(voiceoverPathAbs)
    : null;
  const voSegments =
    voiceoverPathAbs && plan?.voSegments?.length ? plan.voSegments : null;

  // ── Musique ──────────────────────────────────────────────────────
  const bgCandidate =
    opts.bgMusicPath !== undefined ? opts.bgMusicPath : (plan?.bgMusicPath ?? null);
  const bgMusicPathAbs =
    bgCandidate && existsSync(bgCandidate) ? resolve(bgCandidate) : null;
  const bgMusicDurationSec = bgMusicPathAbs
    ? probeDurationSec(bgMusicPathAbs)
    : null;

  const timeline = buildOtioTimeline({
    tourName: opts.tourName ?? tourId,
    fps: manifest.fps,
    introSec: INTRO_HOLD_SEC,
    outroSec: OUTRO_HOLD_SEC,
    videoClips,
    voSegments,
    voiceoverPathAbs,
    voiceoverDurationSec,
    bgMusicPathAbs,
    bgMusicDurationSec,
  });

  const otioPath = join(tourDir, `${tourId}.otio`);
  writeFileSync(otioPath, JSON.stringify(timeline, null, 2));

  return {
    otioPath,
    sections: videoClips.length,
    voSegments: voSegments?.length ?? 0,
    hasMusic: bgMusicPathAbs !== null,
    timelineName: opts.tourName ?? tourId,
  };
}
