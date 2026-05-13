import { NextResponse } from "next/server";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * DELETE d'un modèle 3D. Sprint 7 phase 3.
 *
 * URL : /api/motion/models/<name>
 *  - <name> doit matcher /^[\w-]+\.(glb|gltf)$/ (sécurité,
 *    pas de path traversal)
 *
 * Après suppression, compose-tour fallback automatiquement sur le
 * device procédural pour le rôle correspondant.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  if (!/^[\w-]+\.(glb|gltf)$/i.test(name)) {
    return NextResponse.json(
      { error: "Nom de fichier invalide" },
      { status: 400 },
    );
  }
  const repoRoot = dirname(
    dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))),
  );
  const target = join(repoRoot, "public", "models", name);
  if (!existsSync(target)) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
  try {
    rmSync(target);
    return NextResponse.json({ ok: true, deleted: name });
  } catch (e) {
    return NextResponse.json(
      { error: `Suppression échouée : ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
