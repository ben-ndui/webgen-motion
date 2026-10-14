import type { NextRequest } from "next/server";

import { controlerLaReplique } from "@/lib/cinema/controle-replique";
import { repondre } from "@/lib/cinema/reponse-http";

/**
 * GET /api/motion/film/<id>/cinema/plans/<plan>/replique — la réplique du plan
 * a-t-elle vraiment été dite ? Transcription locale (whisper), gratuite.
 * Réponse : { controle: { statut: "dite" | "ecart", entendu } | { statut: "indisponible", raison } }.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; plan: string }> }) {
  const { id, plan } = await ctx.params;
  return repondre(() => controlerLaReplique(id, plan));
}
