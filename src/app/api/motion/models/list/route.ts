import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Liste les modèles 3D présents dans public/models/.
 * Sprint 7 phase 3 — page de gestion des GLBs Sketchfab depuis l'UI.
 *
 * Retourne pour chaque .glb / .gltf :
 *  - name    : nom du fichier
 *  - sizeMB  : taille en MB pour info
 *  - mtime   : timestamp de modification (pour cache-busting)
 *  - role    : "iphone" | "macbook" | "other" — selon le naming
 *              attendu par compose-tour.
 */
export async function GET() {
  // process.cwd() = répertoire où next dev tourne = repo root.
  // Plus robuste que dirname × N depuis import.meta.url qui dépend
  // de la profondeur du fichier route.ts.
  const modelsDir = join(process.cwd(), "public", "models");
  if (!existsSync(modelsDir)) {
    mkdirSync(modelsDir, { recursive: true });
    return NextResponse.json({ models: [] });
  }
  const entries = readdirSync(modelsDir);
  const models = entries
    .filter((f) => f.endsWith(".glb") || f.endsWith(".gltf"))
    .map((f) => {
      const stat = statSync(join(modelsDir, f));
      const base = f.replace(/\.(glb|gltf)$/i, "").toLowerCase();
      const role: "iphone" | "macbook" | "other" =
        base === "iphone"
          ? "iphone"
          : base === "macbook"
            ? "macbook"
            : "other";
      return {
        name: f,
        sizeMB: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
        mtime: stat.mtimeMs,
        role,
      };
    });
  return NextResponse.json({ models });
}
