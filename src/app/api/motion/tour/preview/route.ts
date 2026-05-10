import { NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * Local — preview endpoint. Streams an MP4 produced by
 * `/api/motion/tour/run` so the dashboard can show it in a `<video>`
 * tag without exposing /tmp directly.
 *
 * Query: ?id=<tourId>&file=<filename>
 *   - id: validated against [\w-]+
 *   - file: validated against the canonical pattern
 *           `section-NN-<categoryId>.mp4` produced by the runner.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const file = url.searchParams.get("file");

  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  // Strict allow-list pattern. Must end in .mp4. Prevents directory
  // traversal via "../" or absolute paths.
  if (!file || !/^section-\d{2}-[\w-]+\.mp4$/.test(file)) {
    return NextResponse.json(
      { error: "Invalid or missing file param" },
      { status: 400 },
    );
  }

  const path = join(getMotionTourDir(id), file);

  if (!existsSync(path)) {
    return NextResponse.json(
      { error: "MP4 not found — run the capture first" },
      { status: 404 },
    );
  }

  const buf = readFileSync(path);
  const size = statSync(path).size;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Cache-Control": "no-store",
    },
  });
}
