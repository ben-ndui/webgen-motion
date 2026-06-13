import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";
import {
  assertExistingDirectory,
  assertOutputDirectory,
  SafePathError,
} from "@/lib/server/safe-path";

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

  // Validation anti-traversal des chemins bruts fournis par le client.
  // projectPath doit être un dossier existant ; outDir (optionnel) doit
  // rester contenu sous projectPath (le default runner = <projectPath>/
  // tours-scaffold). La garde desktop-only (middleware) restreint déjà
  // l'accès à la machine locale, mais on durcit la forme de l'entrée.
  let safeProjectPath: string;
  let safeOutDir: string | undefined;
  try {
    safeProjectPath = assertExistingDirectory(projectPath, "projectPath");
    if (outDir !== undefined) {
      safeOutDir = assertOutputDirectory(outDir, "outDir", safeProjectPath);
    }
  } catch (e) {
    if (e instanceof SafePathError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    return NextResponse.json(
      { error: "baseUrl invalide (http(s)://…)" },
      { status: 400 },
    );
  }

  const runnerArgs = ["--project-path", safeProjectPath, "--base-url", baseUrl];
  if (format === "9:16" || format === "16:9") {
    runnerArgs.push("--format", format);
  }
  if (typeof maxTours === "number" && maxTours > 0) {
    runnerArgs.push("--max-tours", String(maxTours));
  }
  if (safeOutDir) {
    runnerArgs.push("--out-dir", safeOutDir);
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
