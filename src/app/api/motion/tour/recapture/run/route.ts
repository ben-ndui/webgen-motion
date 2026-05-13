import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";

/**
 * Recapture une seule section sans toucher aux autres MP4s. Spawn
 * `scripts/capture-tour.ts --only-section <N>` et stream NDJSON
 * comme `/api/motion/tour/run` classique.
 *
 * Body : { tourId, sectionIndex } (sectionIndex est 1-based comme
 * dans le manifest).
 *
 * Préconditions :
 *  - manifest.json doit exister (sinon faut une capture complète d'abord)
 *  - sectionIndex doit pointer sur une section existante du tour
 *
 * Sprint UX post-capture · Phase 1. Cf. roadmap mémoire :
 * "Sprint UX post-capture — Édition MP4 sans re-filmer".
 */
export async function POST(req: NextRequest) {
  let body: { tourId?: string; sectionIndex?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { tourId, sectionIndex } = body;
  if (!tourId || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }
  if (
    typeof sectionIndex !== "number" ||
    !Number.isInteger(sectionIndex) ||
    sectionIndex < 1
  ) {
    return NextResponse.json(
      { error: "sectionIndex doit être un entier ≥ 1" },
      { status: 400 },
    );
  }
  const tourDir = getMotionTourDir(tourId);
  if (!existsSync(join(tourDir, "manifest.json"))) {
    return NextResponse.json(
      {
        error:
          "Manifest absent — lance d'abord une capture complète avant de recapturer une section.",
      },
      { status: 400 },
    );
  }

  const runnerArgs = [
    "--tour-id",
    tourId,
    "--out",
    tourDir,
    "--only-section",
    String(sectionIndex),
  ];
  const spawnSpec = resolveRunnerSpawn("capture-tour", runnerArgs);
  const startedAt = Date.now();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      };
      emit({
        type: "phase",
        label: `Recapture de la section ${sectionIndex}…`,
      });

      const proc = spawn(spawnSpec.command, spawnSpec.args, {
        cwd: spawnSpec.cwd,
        env: { ...process.env, NO_COLOR: "1" },
      });
      let stderrBuf = "";
      proc.stdout.on("data", (d) => {
        // Le runner capture-tour ne stream pas NDJSON pour l'instant
        // — on relaie ses console.log tels quels comme événements
        // `log` pour que l'UI puisse les afficher.
        const txt = d.toString();
        for (const line of txt.split("\n")) {
          if (line.trim()) emit({ type: "log", message: line });
        }
      });
      proc.stderr.on("data", (d) => {
        const s = d.toString();
        stderrBuf += s;
        process.stderr.write(`[recapture-section] ${s}`);
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
            message: `Recapture exited with code ${code}`,
            wallSec,
            stderr: stderrBuf.slice(-1500),
          });
        } else {
          emit({
            type: "done",
            ok: true,
            tourId,
            sectionIndex,
            wallSec,
          });
        }
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
