import { resolve } from "node:path";
import { existsSync } from "node:fs";

/**
 * Resolves the spawn config for a CLI runner script
 * (`audio-tour`, `capture-tour`, `compose-tour`, `analyze-audio`).
 *
 * Two modes :
 *
 * - **Dev** (Next dev server) : `tsx scripts/<runner>.ts` from
 *   the repo root. `npx tsx` resolves both via local node_modules.
 *
 * - **Packaged Tauri** : `WEBGEN_RUNNERS_DIR` is set by the Rust
 *   shell to the bundle's Resources directory. The directory ships
 *   the `scripts/` + a `runner-deps/node_modules/` tree (bundled
 *   by `scripts/desktop-prepare-runners.mjs` at build time) and
 *   uses the bundled Node binary from the same Resources path.
 *
 * Routes import this helper instead of hard-coding `["tsx",
 * "scripts/X.ts"]`, so swapping the runtime contract stays in one
 * place.
 */

export interface RunnerSpawn {
  command: string;
  args: string[];
  cwd: string;
}

const RUNNER_FILES: Record<string, string> = {
  "audio-tour": "audio-tour.ts",
  "capture-tour": "capture-tour.ts",
  "compose-tour": "compose-tour.ts",
  "analyze-audio": "analyze-audio.ts",
  "agent-generate-tour": "agent-generate-tour.ts",
  "scaffold-tours-from-project": "scaffold-tours-from-project.ts",
};

export function resolveRunnerSpawn(
  runner: keyof typeof RUNNER_FILES | string,
  extraArgs: string[] = [],
): RunnerSpawn {
  const fileName = RUNNER_FILES[runner];
  if (!fileName) {
    throw new Error(`Unknown runner : ${runner}`);
  }

  // Packaged desktop : the Rust shell sets WEBGEN_RUNNERS_DIR to
  // the unpacked Resources/runners directory. In that mode we MUST
  // NOT shell out via `npx` because a macOS .app launched from
  // Finder doesn't inherit the user's PATH — `/opt/homebrew/bin/npx`
  // simply isn't visible and the spawn fails with ENOENT. Instead
  // we invoke the bundled Node binary (the same one running the
  // Next server : `process.execPath` is the Tauri sidecar) with an
  // explicit path to tsx's CLI script.
  const resDir = process.env.WEBGEN_RUNNERS_DIR;
  if (resDir && existsSync(resDir)) {
    const scriptPath = resolve(resDir, "scripts", fileName);
    const tsxCli = resolve(resDir, "node_modules", "tsx", "dist", "cli.mjs");
    if (existsSync(scriptPath) && existsSync(tsxCli)) {
      return {
        command: process.execPath,
        args: [tsxCli, scriptPath, ...extraArgs],
        cwd: resDir,
      };
    }
  }

  // Dev fallback : relative path from process.cwd() (the repo root
  // when Next dev is running). `npx` is fine here because dev runs
  // inside a terminal with the full user PATH.
  return {
    command: "npx",
    args: ["tsx", `scripts/${fileName}`, ...extraArgs],
    cwd: process.cwd(),
  };
}
