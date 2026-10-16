import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { reponseVideo } from "@/lib/servir-une-video";

/**
 * streams the composed `final.mp4` for a tour (byte ranges supported, so
 * the browser can seek: the dashboard cards show a frame mid-video).
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

  return reponseVideo(req, path);
}
