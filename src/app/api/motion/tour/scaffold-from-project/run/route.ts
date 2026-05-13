import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";

/**
 * Scaffold des tours en bulk depuis un repo Next.js cible.
 * Sprint 6 — extraction Motion Studio standalone.
 *
 * Body : { projectPath, baseUrl, format?, maxTours?, outDir? }
 *  - projectPath : chemin absolu du projet Next.js cible (le repo
 *    que tu veux filmer)
 *  - baseUrl : URL servie pendant la future capture (typiquement
 *    http://localhost:3000 du projet cible)
 *  - format : "16:9" | "9:16" (default 16:9)
 *  - maxTours : cap optionnel
 *  - outDir : où écrire les JSON, default `<projectPath>/tours-scaffold`
 *
 * Stream NDJSON des events du runner. Pour chaque route détectée,
 * un fichier tour est écrit dans outDir.
 */
export async function POST(req: NextRequest) {
  let body: {
    projectPath?: string;
    baseUrl?: string;
    format?: string;
    maxTours?: number;
    outDir?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { projectPath, baseUrl, format, maxTours, outDir } = body;
  if (!projectPath || typeof projectPath !== "string") {
    return NextResponse.json(
      { error: "projectPath manquant" },
      { status: 400 },
    );
  }
  if (!existsSync(projectPath)) {
    return NextResponse.json(
      { error: `Chemin introuvable : ${projectPath}` },
      { status: 400 },
    );
  }
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    return NextResponse.json(
      { error: "baseUrl invalide (http(s)://…)" },
      { status: 400 },
    );
  }

  const runnerArgs = ["--project-path", projectPath, "--base-url", baseUrl];
  if (format === "9:16" || format === "16:9") {
    runnerArgs.push("--format", format);
  }
  if (typeof maxTours === "number" && maxTours > 0) {
    runnerArgs.push("--max-tours", String(maxTours));
  }
  if (outDir && typeof outDir === "string") {
    runnerArgs.push("--out-dir", outDir);
  }
  const spawnSpec = resolveRunnerSpawn(
    "scaffold-tours-from-project",
    runnerArgs,
  );
  const startedAt = Date.now();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      };
      emit({ type: "phase", label: "Démarrage du scaffolder…" });

      const proc = spawn(spawnSpec.command, spawnSpec.args, {
        cwd: spawnSpec.cwd,
        env: { ...process.env, NO_COLOR: "1" },
      });
      let stdoutBuf = "";
      let stderrBuf = "";

      proc.stdout.on("data", (d) => {
        stdoutBuf += d.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as Record<string, unknown>;
            emit(event);
          } catch {
            emit({ type: "log", message: line });
          }
        }
      });
      proc.stderr.on("data", (d) => {
        const s = d.toString();
        stderrBuf += s;
        process.stderr.write(`[scaffold-tours] ${s}`);
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
            message: `Scaffold exited with code ${code}`,
            wallSec,
            stderr: stderrBuf.slice(-1500),
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
