import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { getTour } from "@/lib/tour-loader";
import { getTrackPath } from "@/lib/motion-audio-store";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";
import { getEdition } from "@/lib/edition";
import { maybeSendActivation } from "@/lib/telemetry";

/**
 * spawns `scripts/compose-tour.ts` (Remotion runner) and streams
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

  // Remotion-based compose runner (level-3 motion design + style
  // presets). The legacy Puppeteer compositor was removed in
  // chunk 7 ; this is now the only path.
  const runnerArgs = ["--tour-id", tourId, "--tour-dir", tourDir];
  if (resolvedBgMusic) {
    runnerArgs.push("--bg-music", resolvedBgMusic);
  }
  if (bgMusicVolume !== undefined) {
    runnerArgs.push("--bg-music-volume", String(bgMusicVolume));
  }
  if (voiceoverVolume !== undefined) {
    runnerArgs.push("--vo-volume", String(voiceoverVolume));
  }
  const spawnSpec = resolveRunnerSpawn("compose-tour", runnerArgs);
  const startedAt = Date.now();

  // Visible depuis cancel() — le client (console Échap) a coupé le
  // stream : on tue le PROCESS GROUP du runner (detached + kill(-pid)),
  // pas juste l'enfant direct — en dev la chaîne npx → tsx → runner →
  // Remotion ne forwarde pas SIGTERM et laisserait des orphelins.
  let child: ReturnType<typeof spawn> | null = null;
  const killRunner = () => {
    if (!child?.pid) return;
    try {
      if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch {
      try {
        child.kill("SIGTERM");
      } catch {}
    }
  };

  const stream = new ReadableStream({
    cancel() {
      killRunner();
    },
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

      const proc = spawn(spawnSpec.command, spawnSpec.args, {
        cwd: spawnSpec.cwd,
        env: { ...process.env, NO_COLOR: "1" },
        // groupe de process dédié — cible du kill(-pid) de cancel()
        detached: process.platform !== "win32",
      });
      child = proc;

      let stdoutBuf = "";
      let stderrBuf = "";

      proc.stdout.on("data", (d) => {
        stdoutBuf += d.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() ?? "";
        for (const line of lines) parseComposeLine(line, emit);
      });
      proc.stderr.on("data", (d) => {
        const s = d.toString();
        stderrBuf += s;
        process.stderr.write(`[compose-tour] ${s}`);
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
        // Activation (North Star) : 1ère compose réussie → 1 event anonyme,
        // opt-out, app packagée uniquement. Fire-and-forget, ne bloque rien.
        void maybeSendActivation(getEdition());
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

  // Banner lines from compose-tour.ts (Remotion runner).
  if (line.startsWith("▶ Remotion compose")) {
    emit({ type: "phase", label: "Bundling de la composition…" });
    return;
  }

  // Remotion CLI : "Bundling N%"
  let m = line.match(/^Bundling (\d+)%/);
  if (m) {
    emit({
      type: "phase",
      label: `Bundling de la composition · ${m[1]}%…`,
    });
    return;
  }

  // Remotion CLI : "Rendered N/M, time remaining: …"
  m = line.match(/^Rendered (\d+)\/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    emit({
      type: "progress",
      frames: n,
      label: `Rendu frame-by-frame · ${n}/${total}`,
    });
    if (n === 0) {
      emit({ type: "phase", label: "Démarrage du rendu Remotion…" });
    }
    return;
  }

  // Remotion CLI : "Encoded N/M" — encoding pass after the render.
  m = line.match(/^Encoded (\d+)\/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    emit({
      type: "progress",
      frames: n,
      label: `Encodage h264 · ${n}/${total}`,
    });
    return;
  }

  // Final "✓ Done → …"
  if (line.startsWith("✓ Done")) {
    emit({ type: "phase", label: "Finalisation…" });
    return;
  }
}
