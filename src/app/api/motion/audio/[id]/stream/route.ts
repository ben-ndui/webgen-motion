import { NextRequest, NextResponse } from "next/server";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";
import { getTrackPath } from "@/lib/motion-audio-store";

/**
 * GET /api/motion/audio/<id>/stream
 * Streams an audio file from the library so the dashboard can preview
 * it via `<audio>` before composing. No range support — files are
 * tiny enough (≤25 MB cap).
 */

const MIME_BY_EXT: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const path = getTrackPath(id);
  if (!path) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }
  const buf = readFileSync(path);
  const size = statSync(path).size;
  const mime = MIME_BY_EXT[extname(path).toLowerCase()] ?? "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(size),
      "Cache-Control": "no-store",
    },
  });
}
