import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";
import { resolveAgent } from "@/lib/config";

/**
 * Spawns `scripts/agent-generate-tour.ts` and streams its NDJSON
 * progress events to the client (Sprint 5, Phase 2/3).
 *
 * Body :
 *   {
 *     baseUrl: "https://...",
 *     outputId: "slug-a-z-0-9-",
 *     preset?: "pitch" | "demo" | "walkthrough" | "showcase",
 *     format?: "16:9" | "9:16",
 *     tone?: "premium" | "playful" | "tech" | "educational",
 *     skipScreenshot?: boolean
 *   }
 *
 * Pre-checks the agent config before spawning so the user gets a
 * fast 400 instead of having to read the NDJSON error event.
 */
export async function POST(req: NextRequest) {
  let body: {
    baseUrl?: string;
    outputId?: string;
    preset?: string;
    format?: string;
    tone?: string;
    skipScreenshot?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { baseUrl, outputId, preset, format, tone, skipScreenshot } = body;
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    return NextResponse.json(
      { error: "baseUrl manquant ou invalide (http(s)://…)" },
      { status: 400 },
    );
  }
  if (!outputId || !/^[\w-]+$/.test(outputId)) {
    return NextResponse.json(
      { error: "outputId manquant ou invalide (a-z 0-9 -)" },
      { status: 400 },
    );
  }
  const agent = resolveAgent();
  if (!agent) {
    return NextResponse.json(
      {
        error:
          "Agent IA pas configuré. Ouvre /setup/agent pour coller ta clé API.",
      },
      { status: 400 },
    );
  }

  const runnerArgs: string[] = [
    "--base-url",
    baseUrl,
    "--output-id",
    outputId,
  ];
  if (preset) runnerArgs.push("--preset", preset);
  if (format) runnerArgs.push("--format", format);
  if (tone) runnerArgs.push("--tone", tone);
  if (skipScreenshot) runnerArgs.push("--no-screenshot");

  const spawnSpec = resolveRunnerSpawn("agent-generate-tour", runnerArgs);
  const startedAt = Date.now();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      };

      emit({ type: "phase", label: "Démarrage de l'agent…" });

      const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1" };
      const proc = spawn(spawnSpec.command, spawnSpec.args, {
        cwd: spawnSpec.cwd,
        env,
      });
      let stdoutBuf = "";
      let stderrBuf = "";

      proc.stdout.on("data", (d) => {
        stdoutBuf += d.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          // Runner emits one JSON event per line — re-emit verbatim.
          try {
            const event = JSON.parse(line) as Record<string, unknown>;
            emit(event);
          } catch {
            // Fallback : if a non-JSON line slipped through, log it
            // for debugging instead of dropping it silently.
            emit({ type: "log", message: line });
          }
        }
      });
      proc.stderr.on("data", (d) => {
        const s = d.toString();
        stderrBuf += s;
        process.stderr.write(`[agent-generate-tour] ${s}`);
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
            message: `Agent exited with code ${code}`,
            wallSec,
            stderr: stderrBuf.slice(-2000),
          });
        } else {
          emit({ type: "complete", wallSec });
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
