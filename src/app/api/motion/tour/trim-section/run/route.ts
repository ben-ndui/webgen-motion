import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * Persiste un trim in/out pour une section dans le manifest.json.
 * Sprint UX post-capture · Phase 3.
 *
 * Body : { tourId, sectionIndex, trimStartSec, trimEndSec }
 *
 * Aucune retouche du MP4 : on garde le fichier complet sur disque
 * (recapturer sans avoir perdu l'original), seul compose-tour
 * applique le trim au moment du render via startFrom/endAt de
 * OffthreadVideo. Trim non-destructif → on peut l'annuler.
 *
 * Validation :
 *  - trimStartSec ≥ 0
 *  - trimEndSec > trimStartSec
 *  - trimEndSec ≤ durationSec de la section (la capture originale)
 *  - section avec index donné doit exister dans le manifest
 *
 * Si trimStartSec = 0 et trimEndSec = durationSec, on supprime les
 * deux champs du manifest (cleanup, équivalent à "pas de trim").
 */
export async function POST(req: NextRequest) {
  let body: {
    tourId?: string;
    sectionIndex?: number;
    trimStartSec?: number;
    trimEndSec?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { tourId, sectionIndex, trimStartSec, trimEndSec } = body;
  if (!tourId || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }
  if (
    typeof sectionIndex !== "number" ||
    !Number.isInteger(sectionIndex) ||
    sectionIndex < 1
  ) {
    return NextResponse.json(
      { error: "sectionIndex doit être un entier ≥ 1" },
      { status: 400 },
    );
  }
  if (
    typeof trimStartSec !== "number" ||
    typeof trimEndSec !== "number" ||
    !Number.isFinite(trimStartSec) ||
    !Number.isFinite(trimEndSec)
  ) {
    return NextResponse.json(
      { error: "trimStartSec / trimEndSec doivent être des nombres finis" },
      { status: 400 },
    );
  }
  if (trimStartSec < 0 || trimEndSec <= trimStartSec) {
    return NextResponse.json(
      { error: "trim incohérent : 0 ≤ start < end" },
      { status: 400 },
    );
  }

  const tourDir = getMotionTourDir(tourId);
  const manifestPath = join(tourDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return NextResponse.json(
      { error: "Manifest absent — lance une capture d'abord." },
      { status: 400 },
    );
  }

  interface ManifestSection {
    index: number;
    durationSec: number;
    trimStartSec?: number;
    trimEndSec?: number;
    [k: string]: unknown;
  }
  interface Manifest {
    sections: ManifestSection[];
    [k: string]: unknown;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as Manifest;
  const section = manifest.sections.find((s) => s.index === sectionIndex);
  if (!section) {
    return NextResponse.json(
      { error: `Section ${sectionIndex} introuvable` },
      { status: 400 },
    );
  }
  if (trimEndSec > section.durationSec + 0.01) {
    return NextResponse.json(
      {
        error: `trimEndSec (${trimEndSec.toFixed(2)}s) dépasse la durée capturée (${section.durationSec.toFixed(2)}s)`,
      },
      { status: 400 },
    );
  }

  // Si trim = full clip, on retire les champs pour garder le manifest
  // propre. Sinon on stocke les valeurs arrondies à 0.01s.
  const isFullClip =
    trimStartSec < 0.05 && Math.abs(trimEndSec - section.durationSec) < 0.05;
  if (isFullClip) {
    delete section.trimStartSec;
    delete section.trimEndSec;
  } else {
    section.trimStartSec = Math.round(trimStartSec * 100) / 100;
    section.trimEndSec = Math.round(trimEndSec * 100) / 100;
  }
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return NextResponse.json({
    ok: true,
    sectionIndex,
    trimStartSec: section.trimStartSec ?? 0,
    trimEndSec: section.trimEndSec ?? section.durationSec,
    effectiveDurationSec:
      (section.trimEndSec ?? section.durationSec) -
      (section.trimStartSec ?? 0),
  });
}
