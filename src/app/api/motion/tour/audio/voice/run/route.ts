import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { resolveElevenLabs } from "@/lib/config";
import { getTour } from "@/lib/tour-loader";

/**
 * generates the voice-over track for a tour by
 * spawning `scripts/audio-tour.ts`. Streams progress events as
 * NDJSON, same wire format as `/api/motion/tour/run`.
 *
 * Body: { tourId: string }
 * Output written to: <tourDir>/voiceover.mp3
 *
 * Required env: ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID. The route
 * does NOT validate them up-front so the runner can produce a
 * single coherent error event in its stream.
 */
export async function POST(req: NextRequest) {
  let body: { tourId?: string; voiceoverOverrides?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { tourId, voiceoverOverrides } = body;
  if (!tourId || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }

  const tourDir = getMotionTourDir(tourId);
  if (!existsSync(join(tourDir, "manifest.json"))) {
    return NextResponse.json(
      {
        error:
          "Manifest not found — run the capture first to know the section timings.",
      },
      { status: 400 },
    );
  }
  // Config wins over env. If neither is set, surface a setup hint.
  const credentials = resolveElevenLabs();
  if (!credentials) {
    return NextResponse.json(
      {
        error:
          "ElevenLabs key + voiceId manquants. Va sur /setup pour les configurer (ou ajoute ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID dans .env.local).",
      },
      { status: 400 },
    );
  }

  // Per-tour overrides (multi-projets light) : if the tour declares
  // its own voiceId / voiceModel, they take precedence over the
  // global config — so the same install can target multiple brands
  // with different cloned voices.
  const tour = getTour(tourId);
  const effectiveVoiceId =
    tour?.voiceId && tour.voiceId.trim().length > 0
      ? tour.voiceId.trim()
      : credentials.voiceId;
  const effectiveModel =
    tour?.voiceModel && tour.voiceModel.trim().length > 0
      ? tour.voiceModel.trim()
      : credentials.model;

  // Persist overrides to disk so the runner can read them by path.
  // Stored next to the manifest so `npm run audio` from CLI also
  // sees the latest overrides without going through this endpoint.
  let overridesPath: string | undefined;
  if (voiceoverOverrides && Object.keys(voiceoverOverrides).length > 0) {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(voiceoverOverrides)) {
      if (typeof v === "string") cleaned[k] = v;
    }
    mkdirSync(tourDir, { recursive: true });
    overridesPath = join(tourDir, "voiceover-overrides.json");
    writeFileSync(overridesPath, JSON.stringify(cleaned, null, 2));
  }

  const args = [
    "tsx",
    "scripts/audio-tour.ts",
    "--tour-id",
    tourId,
    "--tour-dir",
    tourDir,
  ];
  if (overridesPath) {
    args.push("--overrides", overridesPath);
  }

  const cwd = process.cwd();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      };

      emit({ type: "phase", label: "Génération de la voix off…" });

      const proc = spawn("npx", args, {
        cwd,
        // Inject the resolved credentials so the runner gets them
        // whether they came from the wizard's config.json or .env.local.
        env: {
          ...process.env,
          NO_COLOR: "1",
          ELEVENLABS_API_KEY: credentials.apiKey,
          ELEVENLABS_VOICE_ID: effectiveVoiceId,
          ELEVENLABS_MODEL: effectiveModel,
        },
      });
      let stdoutBuf = "";
      let stderrBuf = "";

      proc.stdout.on("data", (d) => {
        stdoutBuf += d.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() ?? "";
        for (const line of lines) parseVoLine(line, emit);
      });
      proc.stderr.on("data", (d) => {
        stderrBuf += d.toString();
      });

      proc.on("error", (err) => {
        emit({ type: "error", message: `Spawn failed: ${err.message}` });
        try {
          controller.close();
        } catch {}
      });

      proc.on("close", (code) => {
        const wallSec = Math.round((Date.now() - startedAt) / 1000);
        if (code !== 0) {
          emit({
            type: "error",
            message: `VO exited with code ${code}`,
            wallSec,
            stderr: stderrBuf.slice(-2000),
          });
          try {
            controller.close();
          } catch {}
          return;
        }
        const voPath = join(tourDir, "voiceover.mp3");
        if (!existsSync(voPath)) {
          emit({ type: "error", message: "voiceover.mp3 not produced" });
          try {
            controller.close();
          } catch {}
          return;
        }
        emit({
          type: "done",
          ok: true,
          tourId,
          voiceoverUrl: `/api/motion/tour/audio/voice/preview?id=${encodeURIComponent(tourId)}&t=${Date.now()}`,
          captureWallTimeSec: wallSec,
        });
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function parseVoLine(
  line: string,
  emit: (e: Record<string, unknown>) => void,
): void {
  if (!line) return;

  // [N/M] TTS → "..."
  let m = line.match(/^ {2}\[(\d+)\/(\d+)\] TTS → /);
  if (m) {
    emit({
      type: "phase",
      label: `Section ${m[1]}/${m[2]} · TTS ElevenLabs…`,
      sectionIdx: parseInt(m[1], 10),
      totalSections: parseInt(m[2], 10),
    });
    return;
  }
  // [N/M] cached VO
  m = line.match(/^ {2}\[(\d+)\/(\d+)\] cached VO/);
  if (m) {
    emit({
      type: "phase",
      label: `Section ${m[1]}/${m[2]} · VO en cache`,
      sectionIdx: parseInt(m[1], 10),
      totalSections: parseInt(m[2], 10),
    });
    return;
  }
  // [N/M] silence (Xs)
  m = line.match(/^ {2}\[(\d+)\/(\d+)\] silence/);
  if (m) {
    emit({
      type: "phase",
      label: `Section ${m[1]}/${m[2]} · silence`,
      sectionIdx: parseInt(m[1], 10),
      totalSections: parseInt(m[2], 10),
    });
    return;
  }
  // ▶ Concat → ...
  if (line.startsWith("▶ Concat")) {
    emit({ type: "phase", label: "Concat des sections…" });
    return;
  }
  if (line.startsWith("⚠ ")) {
    emit({ type: "warn", message: line.slice(2).trim() });
    return;
  }
}
