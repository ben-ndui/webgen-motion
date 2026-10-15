import { NextRequest, NextResponse } from "next/server";

import { estNomSur } from "@/lib/film-store";
import { relayerUnRunner } from "@/lib/relayer-un-runner";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";
import { argumentsDuRunner, lireLaDemandeDEcrans } from "@/lib/site/demande-d-ecrans";
import { prendreLeSite, rendreLeSite } from "@/lib/site/verrou-du-site";

/**
 * POST /api/motion/film/<id>/ecrans — « Tes écrans » avec Claude.
 * { geste: "proposer", url, groupe, aEviter? } : Claude propose une page par case (rien n'est écrit).
 * { geste: "filmer", url, groupe, pages } : filme les pages gardées dans leurs cases.
 * Progression NDJSON (phase…, puis done ou error), comme le remplissage.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!estNomSur(id)) return NextResponse.json({ erreur: "Film invalide" }, { status: 400 });
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const demande = lireLaDemandeDEcrans(corps);
  if ("erreur" in demande) return NextResponse.json({ erreur: demande.erreur }, { status: 400 });

  if (!prendreLeSite(id)) return NextResponse.json({ erreur: "GEN MOTION lit déjà le site de ce film : attends la fin." }, { status: 409 });
  const lancement = resolveRunnerSpawn("ecrans-du-site", argumentsDuRunner(id, demande));
  return relayerUnRunner(lancement, { quandFini: () => rendreLeSite(id), messageSiArret: "La lecture du site s'est arrêtée" });
}
