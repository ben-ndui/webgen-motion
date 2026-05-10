import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { getTour } from "@/lib/tour-loader";

/**
 * Compute the brand info shown on the compose stage. Priority :
 *   1. tour.brand.* (explicit overrides)
 *   2. fallbacks derived from tour.name + tour.baseUrl
 *   3. last-resort defaults from the tourId
 *
 * This runs server-side at request time so it always reflects the
 * current tour file — no need to re-capture when the user tweaks
 * brand metadata.
 */
function computeBrand(id: string): {
  displayName: string;
  domain: string;
  tagline: string;
} {
  const tour = getTour(id);
  const fallbackName = id
    .split(/[-_]/g)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  let domain = "localhost";
  if (tour?.baseUrl) {
    try {
      domain = new URL(tour.baseUrl).host;
    } catch {
      domain = "localhost";
    }
  }
  const displayName =
    tour?.brand?.displayName ?? tour?.name ?? fallbackName;
  const finalDomain = tour?.brand?.domain ?? domain;
  const tagline = tour?.brand?.tagline ?? finalDomain;
  return { displayName, domain: finalDomain, tagline };
}

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
    // Surface the voiceover availability so the compose page can wire
    // `<audio>` for live preview without a second roundtrip.
    const voiceoverPath = join(getMotionTourDir(id), "voiceover.mp3");
    const hasVoiceover = existsSync(voiceoverPath);
    const brand = computeBrand(id);
    return NextResponse.json(
      {
        ...manifest,
        sections,
        hasVoiceover,
        voiceoverUrl: hasVoiceover
          ? `/api/motion/tour/audio/voice/preview?id=${encodeURIComponent(id)}`
          : null,
        brand,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: `manifest parse failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
