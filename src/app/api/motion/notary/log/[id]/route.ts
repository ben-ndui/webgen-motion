import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

/**
 * Fetches Apple's detailed notarization log for one submission ID.
 * Only useful for Invalid submissions — gives the per-binary list
 * of "not signed / no timestamp / hardened runtime missing" issues
 * that caused the rejection.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const appleId = process.env.APPLE_ID;
  const password = process.env.APPLE_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  if (!appleId || !password || !teamId) {
    return NextResponse.json(
      { error: "Missing Apple credentials" },
      { status: 400 },
    );
  }

  const json = await runNotarytool([
    "log",
    id,
    "--apple-id",
    appleId,
    "--password",
    password,
    "--team-id",
    teamId,
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
          error: `Failed to parse notarytool log: ${(e as Error).message}`,
        });
      }
    });
    child.on("error", (err) =>
      resolve({ ok: false, error: `spawn xcrun: ${err.message}` }),
    );
  });
}
