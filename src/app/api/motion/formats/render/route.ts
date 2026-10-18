import { NextRequest, NextResponse } from "next/server";

import { isFeatureEnabled } from "@/lib/edition";
import { lireRequeteDeRenduDeFormat, preparerRenduDeFormat } from "@/lib/formats/format-rendu";
import { urlDuRenduDeFormat } from "@/lib/formats/format-store";
import { diffuserLeRendu } from "@/lib/rendu-en-flux";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";

/**
 * POST /api/motion/formats/render — { id, declinaison } : rend une déclinaison
 * d'un projet de format (scripts/render-format.ts) et diffuse la progression
 * en NDJSON, avec le même contrat que le rendu des films. Projet, médias et
 * paroles sont vérifiés AVANT le lancement : 400 avec TOUTES les erreurs.
 */
export async function POST(req: NextRequest) {
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const lecture = lireRequeteDeRenduDeFormat(corps);
  if (!lecture.ok) return NextResponse.json({ error: lecture.erreur }, { status: 400 });
  const { id, declinaison } = lecture;

  if (!isFeatureEnabled("film-de-marque")) {
    return NextResponse.json({ error: "studio-required", message: "Le rendu des formats est une feature Studio Edition." }, { status: 403 });
  }
  const preparation = preparerRenduDeFormat(id, declinaison);
  if (!preparation.ok) return NextResponse.json({ error: "Rendu refusé", erreurs: preparation.erreurs }, { status: preparation.statut });

  return diffuserLeRendu({
    spawnSpec: resolveRunnerSpawn("render-format", ["--id", id, "--declinaison", declinaison]),
    sortie: preparation.sortie,
    journal: "render-format",
    termine: (infos) => ({ id, declinaison, url: urlDuRenduDeFormat(id, declinaison, Math.round(infos.mtimeMs)) }),
  });
}
