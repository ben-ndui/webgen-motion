import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { repondre, studioRequis } from "@/lib/cinema/reponse-http";
import { ecrireUnEpisode } from "@/lib/cinema/scenario-claude";

/**
 * POST /api/motion/film/<id>/cinema/scenario — { brief } : Claude écrit un
 * épisode. Réponse : { cinema, episodeId } (la série proposée, PAS enregistrée :
 * l'écran la pose dans la fiche). Quelques centimes de Claude, sur ta clé.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id } = await ctx.params;
  let corps: { brief?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const brief = typeof corps?.brief === "string" ? corps.brief : "";
  return repondre(() => ecrireUnEpisode(id, brief));
}
