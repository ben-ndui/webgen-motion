import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { getTour } from "@/lib/tour-loader";
import { isFeatureEnabled } from "@/lib/edition";
import { getTrackPath } from "@/lib/motion-audio-store";
import { exportTourOtio } from "@/lib/otio/export-otio";

/**
 * Sprint E — export OpenTimelineIO (Studio Edition).
 *
 * POST { tourId, bgMusicId? } → génère `<tourDir>/<tourId>.otio`
 * (sections découpées par l'Edit Engine, VO segmentée, musique) et
 * retourne le fichier en download direct. La musique : `bgMusicId`
 * (library) si fourni, sinon celle du dernier compose
 * (edit-plan.json), sinon pas de piste.
 *
 * 403 quand le flag `otio-export` n'est pas débloqué (Community) —
 * l'UI affiche l'upsell Studio.
 */
export async function POST(req: NextRequest) {
  let body: { tourId?: string; bgMusicId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { tourId, bgMusicId } = body;
  if (!tourId || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }
  if (!isFeatureEnabled("otio-export")) {
    return NextResponse.json(
      {
        error: "studio-required",
        message:
          "L'export OTIO (DaVinci Resolve / Premiere) est une feature Studio Edition.",
      },
      { status: 403 },
    );
  }

  const tourDir = getMotionTourDir(tourId);
  if (!existsSync(tourDir)) {
    return NextResponse.json(
      { error: "Tour non capturé — lance une capture d'abord." },
      { status: 400 },
    );
  }

  let bgMusicPath: string | null | undefined;
  if (bgMusicId !== undefined) {
    bgMusicPath = bgMusicId === "" ? null : getTrackPath(bgMusicId);
    if (bgMusicId !== "" && !bgMusicPath) {
      return NextResponse.json(
        { error: `Audio track introuvable : ${bgMusicId}` },
        { status: 400 },
      );
    }
  }

  try {
    const tour = getTour(tourId);
    const result = exportTourOtio({
      tourId,
      tourDir,
      tourName: tour?.name,
      ...(bgMusicPath !== undefined ? { bgMusicPath } : {}),
    });
    const content = readFileSync(result.otioPath);
    return new Response(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${tourId}.otio"`,
        "Cache-Control": "no-store",
        "X-Otio-Sections": String(result.sections),
        "X-Otio-Vo-Segments": String(result.voSegments),
        "X-Otio-Has-Music": result.hasMusic ? "1" : "0",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
