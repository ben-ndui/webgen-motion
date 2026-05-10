import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getMotionToursBaseDir,
  getMotionTourDir,
} from "@/lib/motion-tour-store";
import { getTour } from "@/lib/tour-loader";

/**
 * spawns `scripts/capture-tour.ts` and streams
 * progress events to the client as **NDJSON** so the dashboard can
 * show phase-by-phase status (instead of a generic spinner).
 *
 * Wire format: each line is a JSON object terminated by `\n`. Event
 * types:
 *   - `{type: "phase", label}`           — high-level milestone
 *   - `{type: "section", index, total, title, category}`
 *   - `{type: "step", index, total, stepType}`
 *   - `{type: "warn", message}`          — non-fatal step skip
 *   - `{type: "done", ok: true, ...}`    — final result + manifest
 *   - `{type: "error", message, ...}`    — fatal
 *
 * The terminal `done`/`error` is the equivalent of the old JSON
 * response payload, so the client can finalise its state machine.
 *
 * Skipped in production deploys — Vercel serverless can't run
 * Puppeteer + Chromium + FFmpeg.
 */
export async function POST(req: NextRequest) {
  let body: { tourId?: string; formatOverride?: "16:9" | "9:16" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { tourId, formatOverride } = body;
  if (!tourId || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }
  if (formatOverride && formatOverride !== "16:9" && formatOverride !== "9:16") {
    return NextResponse.json(
      { error: "formatOverride must be '16:9' or '9:16'" },
      { status: 400 },
    );
  }

  mkdirSync(getMotionToursBaseDir(), { recursive: true });
  const outDir = getMotionTourDir(tourId);

  // Width/height come from format presets in the runner; we no longer
  // hardcode 1920×1080 here so portrait captures get the right viewport.
  // baseUrl is read from the catalogue when a tour points at a
  // surface other than the dashboard (separate site, future Flutter
  // web build, Storybook, etc.). Falls back to localhost:3000.
  const tour = getTour(tourId);
  const baseUrl = tour?.baseUrl ?? "http://localhost:3000";
  const args = [
    "tsx",
    "scripts/capture-tour.ts",
    "--tour-id",
    tourId,
    "--base-url",
    baseUrl,
    "--fps",
    "30",
    "--out",
    outDir,
  ];
  if (formatOverride) {
    args.push("--format", formatOverride);
  }

  const cwd = process.cwd();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify(event) + "\n"),
          );
        } catch {
          /* controller closed */
        }
      };

      emit({ type: "phase", label: "Lancement du runner Puppeteer…" });

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
        for (const line of lines) parseCaptureLine(line, emit);
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
            message: `Capture exited with code ${code}`,
            wallSec,
            stderr: stderrBuf.slice(-2000),
          });
          try {
            controller.close();
          } catch {}
          return;
        }

        const manifestPath = join(outDir, "manifest.json");
        if (!existsSync(manifestPath)) {
          emit({
            type: "error",
            message: "manifest.json not produced",
          });
          try {
            controller.close();
          } catch {}
          return;
        }

        try {
          interface ManifestSection {
            file: string;
            sizeBytes: number;
            [k: string]: unknown;
          }
          const manifest = JSON.parse(
            readFileSync(manifestPath, "utf-8"),
          ) as {
            width: number;
            height: number;
            fps: number;
            totalDurationSec: number;
            sections: ManifestSection[];
          };
          const cacheBust = Date.now();
          const sections = manifest.sections.map((s) => ({
            ...s,
            mp4Url: `/api/motion/tour/preview?id=${encodeURIComponent(tourId)}&file=${encodeURIComponent(s.file)}&t=${cacheBust}`,
          }));
          const totalSizeBytes = manifest.sections.reduce(
            (acc, s) => acc + s.sizeBytes,
            0,
          );
          emit({
            type: "done",
            ok: true,
            tourId,
            width: manifest.width,
            height: manifest.height,
            fps: manifest.fps,
            totalDurationSec: manifest.totalDurationSec,
            totalSizeBytes,
            captureWallTimeSec: wallSec,
            sections,
          });
        } catch (e) {
          emit({
            type: "error",
            message: `manifest parse failed: ${(e as Error).message}`,
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

/**
 * Parses a single line of the runner's stdout and emits a typed
 * progress event. Patterns mirror the runner's `console.log` output
 * — keep them in sync if the runner format changes.
 */
function parseCaptureLine(
  line: string,
  emit: (e: Record<string, unknown>) => void,
): void {
  if (!line) return;

  // ━ Section X/Y · CategoryLabel · "Title"
  let m = line.match(/^━ Section (\d+)\/(\d+) · (.+?) · "(.+)"$/);
  if (m) {
    emit({
      type: "section",
      index: parseInt(m[1], 10),
      total: parseInt(m[2], 10),
      category: m[3],
      title: m[4],
    });
    return;
  }

  // [N/M] step_type
  m = line.match(/^  \[(\d+)\/(\d+)\] (\w+)/);
  if (m) {
    emit({
      type: "step",
      index: parseInt(m[1], 10),
      total: parseInt(m[2], 10),
      stepType: m[3],
    });
    return;
  }

  // ▶ Navigating to <url>
  if (line.startsWith("  ▶ Navigating to")) {
    emit({ type: "phase", label: "Navigation initiale…" });
    return;
  }

  // ▶ N frames → section-X-cat.mp4
  m = line.match(/^  ▶ (\d+) frames → (.+\.mp4)$/);
  if (m) {
    emit({
      type: "phase",
      label: `Encoding section MP4 (${m[1]} frames)…`,
    });
    return;
  }

  // ⚠ step failed: ...
  m = line.match(/^ {4}⚠ step failed: (.+)$/);
  if (m) {
    emit({ type: "warn", message: `Étape ignorée : ${m[1]}` });
    return;
  }
}
