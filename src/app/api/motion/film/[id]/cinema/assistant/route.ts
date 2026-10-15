import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { demanderALAssistant } from "@/lib/cinema/assistant/assistant";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/assistant — { cinema, demande } : une
 * proposition de Claude (réplique, consigne, dialogues d'une scène, plan
 * suivant, épisode suivant) sur la série telle qu'elle est à l'écran.
 * Réponse : { proposition }, PAS enregistrée. Quelques centimes, sur ta clé.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id } = await ctx.params;
  let corps: { cinema?: unknown; demande?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  return repondre(() => demanderALAssistant(id, corps?.cinema, corps?.demande));
}
