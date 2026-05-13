import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Upload d'un GLB/glTF dans public/models/. Sprint 7 phase 3.
 *
 * Body : multipart/form-data
 *  - file : Blob (.glb ou .gltf)
 *  - role : "iphone" | "macbook" — détermine le nom du fichier
 *           cible (iphone.glb / macbook.glb), donc remplace le
 *           modèle existant pour ce rôle. Pas d'accumulation.
 *
 * Le fichier est écrit avec le naming convention que compose-tour
 * cherche : `iphone.glb` ou `macbook.glb`. L'extension est forcée
 * en .glb même si le user upload un .gltf (pour cohérence).
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Multipart parse failed" }, { status: 400 });
  }
  const file = form.get("file");
  const role = form.get("role");

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: `Fichier trop gros (${Math.round(file.size / 1024 / 1024)} MB) — limite 50 MB. Compresse le GLB via gltfpack.` },
      { status: 400 },
    );
  }
  if (role !== "iphone" && role !== "macbook") {
    return NextResponse.json(
      { error: "role doit être 'iphone' ou 'macbook'" },
      { status: 400 },
    );
  }
  // Loose extension check
  const fileName = (file as File).name ?? "";
  if (!/\.(glb|gltf)$/i.test(fileName)) {
    return NextResponse.json(
      { error: `Format non supporté : ${fileName}. Attendu : .glb ou .gltf` },
      { status: 400 },
    );
  }

  const modelsDir = join(process.cwd(), "public", "models");
  mkdirSync(modelsDir, { recursive: true });
  const targetPath = join(modelsDir, `${role}.glb`);

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    writeFileSync(targetPath, buf);
    return NextResponse.json({
      ok: true,
      role,
      sizeMB: Math.round((buf.length / (1024 * 1024)) * 100) / 100,
      path: `models/${role}.glb`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Écriture échouée : ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
