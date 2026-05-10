import { NextRequest, NextResponse } from "next/server";
import {
  addTrack,
  listTracks,
  reconcileIndex,
} from "@/lib/motion-audio-store";

/**
 * Audio library.
 *
 * GET    /api/motion/audio        → list tracks
 * POST   /api/motion/audio        → upload (multipart/form-data, field "file")
 *
 * Storage lives outside the repo (`~/.webgen-motion/audio/`) so the
 * library is shared across runs and doesn't bloat git.
 */

export async function GET() {
  reconcileIndex();
  return NextResponse.json(
    { tracks: listTracks() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form-data body" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Champ `file` manquant" },
      { status: 400 },
    );
  }
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const result = await addTrack(buf, file.name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, track: result.track });
}
