import { NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getMotionToursBaseDir } from "@/lib/motion-tour-store";

/**
 * Lists all previously-captured tours that still have a manifest on
 * disk (they live in `~/.webgen-motion/tours/`). Returns newest-first.
 */
export async function GET() {
  const base = getMotionToursBaseDir();
  if (!existsSync(base)) return NextResponse.json({ entries: [] });

  interface ManifestSection {
    sizeBytes: number;
    [k: string]: unknown;
  }
  interface Entry {
    tourId: string;
    generatedAt: string;
    sectionCount: number;
    totalDurationSec: number;
    totalSizeBytes: number;
    hasFinal: boolean;
    finalSizeBytes: number;
  }

  const entries: Entry[] = [];
  for (const dir of readdirSync(base)) {
    const manifestPath = join(base, dir, "manifest.json");
    const finalPath = join(base, dir, "final.mp4");
    if (!existsSync(manifestPath)) continue;
    try {
      const m = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
        generatedAt?: string;
        totalDurationSec?: number;
        sections?: ManifestSection[];
      };
      const totalSizeBytes = (m.sections ?? []).reduce(
        (acc, s) => acc + (s.sizeBytes ?? 0),
        0,
      );
      const hasFinal = existsSync(finalPath);
      entries.push({
        tourId: dir,
        generatedAt: m.generatedAt ?? "1970-01-01T00:00:00Z",
        sectionCount: m.sections?.length ?? 0,
        totalDurationSec: m.totalDurationSec ?? 0,
        totalSizeBytes,
        hasFinal,
        finalSizeBytes: hasFinal ? statSync(finalPath).size : 0,
      });
    } catch {
      // Skip malformed manifests silently.
    }
  }

  entries.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  return NextResponse.json(
    { entries },
    { headers: { "Cache-Control": "no-store" } },
  );
}
