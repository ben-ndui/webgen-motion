import { NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * streams the composed `final.mp4` for a tour.
 * Separate route from `/preview` because the final clip uses a
 * fixed filename (no `?file=...` param) — easier to embed in the
 * dashboard's hero video player.
 *
 * Query: ?id=<tourId>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const path = join(getMotionTourDir(id), "final.mp4");
  if (!existsSync(path)) {
    return NextResponse.json(
      { error: "final.mp4 not found — compose first" },
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
