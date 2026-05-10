import { NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * One-shot status of a tour's persisted artifacts. The tour preview
 * page calls this on mount to restore state without forcing a
 * re-capture.
 *
 * Query: ?id=<tourId>
 * Response:
 *   {
 *     tourId,
 *     hasManifest, hasVoiceover, hasFinal,
 *     manifest?: { sections: [...] with mp4Url + cache-busted timestamps },
 *     voiceoverUrl?, voiceoverSizeBytes?,
 *     finalUrl?, finalSizeBytes?
 *   }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const dir = getMotionTourDir(id);
  const manifestPath = join(dir, "manifest.json");
  const voiceoverPath = join(dir, "voiceover.mp3");
  const finalPath = join(dir, "final.mp4");

  const hasManifest = existsSync(manifestPath);
  const hasVoiceover = existsSync(voiceoverPath);
  const hasFinal = existsSync(finalPath);

  interface ManifestSection {
    file: string;
    sizeBytes: number;
    [k: string]: unknown;
  }
  let manifest: {
    width: number;
    height: number;
    fps: number;
    totalDurationSec: number;
    sections: Array<ManifestSection & { mp4Url?: string }>;
    generatedAt: string;
    totalSizeBytes?: number;
  } | undefined;

  if (hasManifest) {
    try {
      const raw = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
        width: number;
        height: number;
        fps: number;
        totalDurationSec: number;
        sections: ManifestSection[];
        generatedAt: string;
      };
      const cacheBust = statSync(manifestPath).mtimeMs;
      const sections = raw.sections.map((s) => ({
        ...s,
        mp4Url: `/api/motion/tour/preview?id=${encodeURIComponent(id)}&file=${encodeURIComponent(s.file)}&t=${cacheBust}`,
      }));
      const totalSizeBytes = raw.sections.reduce(
        (acc, s) => acc + (s.sizeBytes ?? 0),
        0,
      );
      manifest = { ...raw, sections, totalSizeBytes };
    } catch {
      // ignore — treat as no manifest
    }
  }

  return NextResponse.json(
    {
      tourId: id,
      hasManifest,
      hasVoiceover,
      hasFinal,
      manifest,
      voiceoverUrl: hasVoiceover
        ? `/api/motion/tour/audio/voice/preview?id=${encodeURIComponent(id)}&t=${statSync(voiceoverPath).mtimeMs}`
        : undefined,
      voiceoverSizeBytes: hasVoiceover ? statSync(voiceoverPath).size : undefined,
      finalUrl: hasFinal
        ? `/api/motion/tour/preview/final?id=${encodeURIComponent(id)}&t=${statSync(finalPath).mtimeMs}`
        : undefined,
      finalSizeBytes: hasFinal ? statSync(finalPath).size : undefined,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
