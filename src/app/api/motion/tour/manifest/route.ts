import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * returns the manifest produced by the most recent
 * `/api/motion/tour/run` for a given tour. The compose page reads
 * this to know which section MP4s to play and in which order.
 *
 * Query: ?id=<tourId>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const manifestPath = join(getMotionTourDir(id), "manifest.json");
  if (!existsSync(manifestPath)) {
    return NextResponse.json(
      { error: "Manifest not found — run the capture first" },
      { status: 404 },
    );
  }

  try {
    const raw = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    // Add per-section preview URLs so the compose page can use them
    // directly in <video src> without rebuilding the URL itself.
    interface ManifestSection {
      file: string;
      [k: string]: unknown;
    }
    const sections = (manifest.sections as ManifestSection[]).map((s) => ({
      ...s,
      mp4Url: `/api/motion/tour/preview?id=${encodeURIComponent(id)}&file=${encodeURIComponent(s.file)}`,
    }));
    return NextResponse.json(
      { ...manifest, sections },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: `manifest parse failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
