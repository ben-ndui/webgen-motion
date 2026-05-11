import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * Returns the `voiceover-alignment.json` produced by the audio-tour
 * runner. Used by the Voice tab's "Calibrer la timeline" action to
 * map narrative-script step markers to dwell durations.
 *
 * Query: ?id=<tourId>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const alignPath = join(getMotionTourDir(id), "voiceover-alignment.json");
  if (!existsSync(alignPath)) {
    return NextResponse.json(
      { error: "Alignment not found — run the voice generation first" },
      { status: 404 },
    );
  }

  try {
    const raw = readFileSync(alignPath, "utf-8");
    return new NextResponse(raw, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `alignment parse failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
