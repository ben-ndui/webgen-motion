import { NextRequest, NextResponse } from "next/server";

import { estNomSur } from "@/lib/film-store";
import { relayerUnRunner } from "@/lib/relayer-un-runner";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";
import { normaliserLAdresse } from "@/lib/site/pages-du-site";
import { prendreLeSite, rendreLeSite } from "@/lib/site/verrou-du-site";

/**
 * POST /api/motion/film/<id>/remplir { url } — lance `scripts/remplir-film.ts`
 * et relaie sa progression en NDJSON (phase…, puis done ou error). Le client
 * qui coupe le flux arrête le navigateur invisible.
 */

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!estNomSur(id)) return NextResponse.json({ erreur: "Film invalide" }, { status: 400 });
  let corps: { url?: unknown; remplacerCaptures?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const url = typeof corps.url === "string" ? normaliserLAdresse(corps.url) : null;
  if (!url) return NextResponse.json({ erreur: "Cette adresse ne ressemble pas à un site (exemple : monsite.fr)" }, { status: 400 });

  // Un seul navigateur à la fois par film (remplissage ou écrans).
  if (!prendreLeSite(id)) return NextResponse.json({ erreur: "GEN MOTION lit déjà le site de ce film : attends la fin." }, { status: 409 });

  const options = corps.remplacerCaptures === true ? ["--remplacer-captures"] : [];
  const lancement = resolveRunnerSpawn("remplir-film", ["--film-id", id, "--url", url, ...options]);
  return relayerUnRunner(lancement, { quandFini: () => rendreLeSite(id), messageSiArret: "La lecture du site s'est arrêtée" });
}
