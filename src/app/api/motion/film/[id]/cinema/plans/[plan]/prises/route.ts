import type { NextRequest } from "next/server";

import { lesPrisesDuPlan } from "@/lib/cinema/prises/gestes";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * GET /api/motion/film/<id>/cinema/plans/<plan>/prises — toutes les prises de
 * ce plan, la retenue marquée. Réponse : { prises: [{ n, fichier, retenue,
 * presente, creeeLe, produitReel?, decoupe? }], plan: { fichier, decoupe, produitReel } }.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; plan: string }> }) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan } = await ctx.params;
  return repondre(() => Promise.resolve(lesPrisesDuPlan(id, plan)));
}
