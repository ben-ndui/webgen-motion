import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { getTour } from "@/lib/tour-loader";
import { getTrackPath } from "@/lib/motion-audio-store";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * spawns `scripts/compose-tour.ts` and streams
 * progress events as **NDJSON** so the dashboard shows phase-by-phase
 * status. Same wire format as `/api/motion/tour/run`.
 */
export async function POST(req: NextRequest) {
  let body: {
    tourId?: string;
    bgMusicId?: string;
    bgMusicVolume?: number;
    voiceoverVolume?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { tourId, bgMusicId, bgMusicVolume, voiceoverVolume } = body;
  if (!tourId || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }
  if (bgMusicId !== undefined && bgMusicId !== "" && !/^[\w-]+$/.test(bgMusicId)) {
    return NextResponse.json(
      { error: "Invalid bgMusicId" },
      { status: 400 },
    );
  }
  const inRange = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 2;
  if (bgMusicVolume !== undefined && !inRange(bgMusicVolume)) {
    return NextResponse.json(
      { error: "bgMusicVolume must be between 0 and 2" },
      { status: 400 },
    );
  }
  if (voiceoverVolume !== undefined && !inRange(voiceoverVolume)) {
    return NextResponse.json(
      { error: "voiceoverVolume must be between 0 and 2" },
      { status: 400 },
    );
  }

  const tourDir = getMotionTourDir(tourId);
  if (!existsSync(join(tourDir, "manifest.json"))) {
    return NextResponse.json(
      {
        error:
          "Manifest not found — run /api/motion/tour/run first to capture sections.",
      },
      { status: 400 },
    );
  }

  const cwd = process.cwd();

  // Resolve bg music path. Priority order:
  //   1. `bgMusicId` from the request body — points at a track in
  //      the audio library (~/.webgen-motion/audio/), uploaded via UI
  //   2. `bgMusic` on the tour catalogue — repo-relative or absolute
  //      path (legacy / committed assets)
  //   3. None
  // Empty `bgMusicId` (`""`) is the explicit "no music" override and
  // wins over the catalogue default.
  const tour = getTour(tourId);
  let resolvedBgMusic: string | undefined;
  if (bgMusicId !== undefined) {
    if (bgMusicId !== "") {
      const path = getTrackPath(bgMusicId);
      if (path) {
        resolvedBgMusic = path;
      } else {
        return NextResponse.json(
          { error: `Audio track introuvable : ${bgMusicId}` },
          { status: 400 },
        );
      }
    }
    // empty string = no music, leave resolvedBgMusic undefined
  } else if (tour?.bgMusic) {
    const candidate = isAbsolute(tour.bgMusic)
      ? tour.bgMusic
      : join(cwd, tour.bgMusic);
    if (existsSync(candidate)) {
      resolvedBgMusic = candidate;
    }
  }

  const args = [
    "tsx",
    "scripts/compose-tour.ts",
    "--tour-id",
    tourId,
    "--base-url",
    "http://localhost:3000",
    "--width",
    "1920",
    "--height",
    "1080",
    "--fps",
    "30",
    "--tour-dir",
    tourDir,
  ];
  if (resolvedBgMusic) {
    args.push("--bg-music", resolvedBgMusic);
  }

  // Voice-over auto-attach: if `voiceover.mp3` is sitting next to the
  // section MP4s (produced by `audio-tour.ts`), include it in the
  // mix. The user generates it via the dashboard's "Générer voix off"
  // button before composing.
  const voiceoverPath = join(tourDir, "voiceover.mp3");
  if (existsSync(voiceoverPath)) {
    args.push("--voiceover", voiceoverPath);
  }
  if (bgMusicVolume !== undefined) {
    args.push("--bg-music-volume", String(bgMusicVolume));
  }
  if (voiceoverVolume !== undefined) {
    args.push("--vo-volume", String(voiceoverVolume));
  }

  const startedAt = Date.now();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify(event) + "\n"),
          );
        } catch {}
      };

      emit({ type: "phase", label: "Lancement du compositor headless…" });

      const proc = spawn("npx", args, {
        cwd,
        env: { ...process.env, NO_COLOR: "1" },
      });

      let stdoutBuf = "";
      let stderrBuf = "";

      proc.stdout.on("data", (d) => {
        stdoutBuf += d.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() ?? "";
        for (const line of lines) parseComposeLine(line, emit);
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
        const finalPath = join(tourDir, "final.mp4");

        if (code !== 0) {
          emit({
            type: "error",
            message: `Compose exited with code ${code}`,
            wallSec,
            stderr: stderrBuf.slice(-2000),
          });
          try {
            controller.close();
          } catch {}
          return;
        }
        if (!existsSync(finalPath) || statSync(finalPath).size < 1000) {
          emit({
            type: "error",
            message: "final.mp4 missing or empty",
          });
          try {
            controller.close();
          } catch {}
          return;
        }

        emit({
          type: "done",
          ok: true,
          tourId,
          finalUrl: `/api/motion/tour/preview/final?id=${encodeURIComponent(tourId)}&t=${Date.now()}`,
          sizeBytes: statSync(finalPath).size,
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

function parseComposeLine(
  line: string,
  emit: (e: Record<string, unknown>) => void,
): void {
  if (!line) return;

  if (line.startsWith("  ▶ Capturing frames")) {
    emit({
      type: "phase",
      label: "Capture frame-by-frame du compositor…",
    });
    return;
  }
  // X frames · Ys elapsed
  let m = line.match(/^ {4}(\d+) frames · ([\d.]+)s elapsed/);
  if (m) {
    emit({
      type: "progress",
      frames: parseInt(m[1], 10),
      elapsedSec: parseFloat(m[2]),
    });
    return;
  }
  // ▶ N frames in Xs · actual Yfps → encoding final MP4…
  m = line.match(
    /^▶ (\d+) frames in [\d.]+s · actual ([\d.]+)fps → encoding/,
  );
  if (m) {
    emit({
      type: "phase",
      label: `Encoding final MP4 (${m[1]} frames @ ${m[2]}fps)…`,
    });
    return;
  }
  // ▶ Mixing bg music: <path>
  if (line.startsWith("  ▶ Mixing bg music")) {
    emit({ type: "phase", label: "Mux audio · bg music…" });
    return;
  }
  // ▶ Mixing voice-over: <path>
  if (line.startsWith("  ▶ Mixing voice-over")) {
    emit({ type: "phase", label: "Mux audio · voix off…" });
    return;
  }
}
