import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

/**
 * Lists Apple Notary Service submissions for the configured Apple
 * Developer account, parsed from `xcrun notarytool history`. Used by
 * the /notary dashboard to show submission states in real time.
 *
 * Creds : reads APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID from env
 * (typically .env.local in dev, or injected by the Tauri shell in
 * packaged builds). No fallback — without creds we can't query Apple.
 */
export async function GET() {
  const appleId = process.env.APPLE_ID;
  const password = process.env.APPLE_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  if (!appleId || !password || !teamId) {
    return NextResponse.json(
      {
        error:
          "Missing Apple credentials. Set APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID in .env.local.",
      },
      { status: 400 },
    );
  }

  const json = await runNotarytool([
    "history",
    "--apple-id",
    appleId,
    "--password",
    password,
    "--team-id",
    teamId,
    "--output-format",
    "json",
  ]);
  if (!json.ok) {
    return NextResponse.json({ error: json.error }, { status: 500 });
  }
  return NextResponse.json(json.data, {
    headers: { "Cache-Control": "no-store" },
  });
}

interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

function runNotarytool(args: string[]): Promise<ToolResult> {
  return new Promise((resolve) => {
    const child = spawn("xcrun", ["notarytool", ...args], { stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve({ ok: false, error: stderr.trim() || `exit ${code}` });
        return;
      }
      try {
        resolve({ ok: true, data: JSON.parse(stdout) });
      } catch (e) {
        resolve({
          ok: false,
          error: `Failed to parse notarytool output: ${(e as Error).message}`,
        });
      }
    });
    child.on("error", (err) =>
      resolve({ ok: false, error: `spawn xcrun: ${err.message}` }),
    );
  });
}
