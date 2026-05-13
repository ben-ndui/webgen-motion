import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

/**
 * Réordonne les sections du manifest.json sans toucher aux MP4s.
 * Sprint UX post-capture · Phase 2.
 *
 * Body : { tourId, order: number[] }
 *   - order = liste des index 1-based des sections, dans le nouvel
 *     ordre de playback. Ex: [3, 1, 2] = la section initialement
 *     indexée 3 joue en premier, puis 1, puis 2.
 *
 * On garde les fichiers section-NN-*.mp4 tels quels (renommer
 * casserait les liens cache-bustés). Le manifest array stocke
 * l'ordre de playback ; compose-tour lit le tableau dans l'ordre.
 * Le champ `index` de chaque section est mis à jour pour matcher
 * sa nouvelle position d'affichage. Le champ `file` reste pointé
 * vers le bon MP4 d'origine.
 */
export async function POST(req: NextRequest) {
  let body: { tourId?: string; order?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { tourId, order } = body;
  if (!tourId || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }
  if (!Array.isArray(order) || order.some((n) => !Number.isInteger(n) || n < 1)) {
    return NextResponse.json(
      { error: "order doit être un tableau d'entiers ≥ 1" },
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
    file: string;
    categoryId: string;
    title: string;
    subtitle?: string;
    durationSec: number;
    sizeBytes: number;
    frames: number;
  }
  interface Manifest {
    sections: ManifestSection[];
    [k: string]: unknown;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as Manifest;
  const byIndex = new Map<number, ManifestSection>();
  for (const s of manifest.sections) byIndex.set(s.index, s);

  // Validate : every order[i] must reference an existing section,
  // and the set must match (no missing, no duplicate).
  if (order.length !== manifest.sections.length) {
    return NextResponse.json(
      {
        error: `order doit lister ${manifest.sections.length} section(s), reçu ${order.length}`,
      },
      { status: 400 },
    );
  }
  const seen = new Set<number>();
  for (const idx of order) {
    if (!byIndex.has(idx)) {
      return NextResponse.json(
        { error: `Section ${idx} introuvable dans le manifest` },
        { status: 400 },
      );
    }
    if (seen.has(idx)) {
      return NextResponse.json(
        { error: `Section ${idx} dupliquée dans order` },
        { status: 400 },
      );
    }
    seen.add(idx);
  }

  // Réordonne : nouveau tableau dans l'ordre demandé, avec `index`
  // mis à jour pour matcher la position. `file` reste pointé vers
  // l'original (sinon il faudrait renommer les MP4s, friction inutile).
  const reordered = order.map((origIdx, newPos) => {
    const src = byIndex.get(origIdx)!;
    return { ...src, index: newPos + 1 };
  });
  manifest.sections = reordered;
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return NextResponse.json({ ok: true, sections: reordered });
}
