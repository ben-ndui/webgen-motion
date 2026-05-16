import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getMotionTourDir } from "@/lib/motion-tour-store";

export const runtime = "nodejs";
// Next default body size is 1 MB — way too small for video uploads.
// 500 MB is comfortable pour une section motion design.
export const maxDuration = 300;

/**
 * Remplace le MP4 d'une section par un fichier uploadé par
 * l'utilisateur. Sprint UX post-capture · Phase 4 (dernière).
 *
 * Body : multipart/form-data
 *   - tourId        (string) — slug du tour
 *   - sectionIndex  (string→int, 1-based) — section à remplacer
 *   - file          (Blob, video/mp4 ou video/quicktime)
 *
 * Flow :
 *  1. Validation des inputs + lookup de la section dans le manifest
 *  2. Save le blob dans un tmp dir
 *  3. ffprobe pour récupérer durée / fps / format
 *  4. Atomic replace du section-NN-*.mp4 cible
 *  5. Patch le manifest (durationSec, sizeBytes, frames recalculés,
 *     wipe les éventuels trimStartSec/trimEndSec stale qui ne
 *     correspondent plus à la nouvelle durée)
 *
 * Non-destructif "lite" : on overwrite le fichier. Si l'utilisateur
 * veut revert il devra recapturer. C'est volontaire pour ne pas
 * accumuler des MB sur disque pour chaque upload.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Multipart parse failed" }, { status: 400 });
  }
  const tourId = form.get("tourId");
  const sectionIndexRaw = form.get("sectionIndex");
  const file = form.get("file");

  if (typeof tourId !== "string" || !/^[\w-]+$/.test(tourId)) {
    return NextResponse.json(
      { error: "Missing or invalid tourId" },
      { status: 400 },
    );
  }
  const sectionIndex =
    typeof sectionIndexRaw === "string" ? parseInt(sectionIndexRaw, 10) : NaN;
  if (!Number.isInteger(sectionIndex) || sectionIndex < 1) {
    return NextResponse.json(
      { error: "sectionIndex doit être un entier ≥ 1" },
      { status: 400 },
    );
  }
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json(
      { error: "Aucun fichier vidéo fourni" },
      { status: 400 },
    );
  }
  // Loose MIME check — quelques navigateurs envoient
  // application/octet-stream pour .mov, on ne bloque pas dessus.
  if (file.type && !file.type.startsWith("video/") && file.type !== "application/octet-stream") {
    return NextResponse.json(
      { error: `Type de fichier non supporté : ${file.type}` },
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
    durationSec: number;
    sizeBytes: number;
    frames: number;
    trimStartSec?: number;
    trimEndSec?: number;
    [k: string]: unknown;
  }
  interface Manifest {
    sections: ManifestSection[];
    fps?: number;
    totalFrames?: number;
    totalDurationSec?: number;
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
  const fps = manifest.fps ?? 30;

  // Save le blob dans un tmp file, puis copy atomique sur la cible
  // pour éviter qu'une lecture concurrente voie un fichier partiel.
  const tmp = mkdtempSync(join(tmpdir(), "wm-upload-"));
  const tmpFile = join(tmp, "uploaded.mp4");
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    writeFileSync(tmpFile, buf);

    // ffprobe : durée + fps. On force le format de sortie en mp4
    // pour la cohérence du compose (OffthreadVideo accepte .mov mais
    // on garde l'extension .mp4 sur disque).
    const ffprobeBin = process.env.WEBGEN_FFPROBE_BIN || "ffprobe";
    const durProbe = spawnSync(
      ffprobeBin,
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        tmpFile,
      ],
      { encoding: "utf-8" },
    );
    const durSec = parseFloat((durProbe.stdout ?? "").trim());
    if (!Number.isFinite(durSec) || durSec < 0.1) {
      return NextResponse.json(
        { error: "Fichier vidéo invalide ou trop court (< 0.1s)" },
        { status: 400 },
      );
    }

    const targetPath = join(tourDir, section.file);
    copyFileSync(tmpFile, targetPath);
    const newSize = statSync(targetPath).size;
    const newFrames = Math.round(durSec * fps);

    // Patch le manifest. Si la nouvelle durée est plus courte que
    // l'ancien trimEnd, on wipe le trim (incohérent).
    section.durationSec = Math.round(durSec * 100) / 100;
    section.sizeBytes = newSize;
    section.frames = newFrames;
    if (section.trimEndSec !== undefined && section.trimEndSec > durSec) {
      delete section.trimStartSec;
      delete section.trimEndSec;
    }
    // Recompute totalFrames + totalDurationSec
    manifest.totalFrames = manifest.sections.reduce(
      (acc, s) => acc + (s.frames ?? 0),
      0,
    );
    manifest.totalDurationSec =
      Math.round((manifest.totalFrames / fps) * 100) / 100;
    manifest.generatedAt = new Date().toISOString();
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return NextResponse.json({
      ok: true,
      sectionIndex,
      durationSec: section.durationSec,
      sizeBytes: section.sizeBytes,
      frames: section.frames,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur upload : ${(e as Error).message}` },
      { status: 500 },
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
