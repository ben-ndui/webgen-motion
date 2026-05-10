import { NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * Streams `<tourDir>/voiceover.mp3` for the tour preview page's
 * `<audio>` element.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const path = join(getMotionTourDir(id), "voiceover.mp3");
  if (!existsSync(path)) {
    return NextResponse.json(
      { error: "voiceover.mp3 not found — generate it first" },
      { status: 404 },
    );
  }
  const buf = readFileSync(path);
  const size = statSync(path).size;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(size),
      "Cache-Control": "no-store",
    },
  });
}
