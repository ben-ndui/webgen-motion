import type { NextRequest } from "next/server";

import { lireLaBibleDeLaSerie } from "@/lib/cinema/bible/lecture";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * GET /api/motion/film/<id>/cinema/bible — toutes les références de la série
 * (personnages puis éléments) avec leur fiche visuelle (bible.json).
 * Réponse : { references: [{ id, type, nom, description, fiche }] }.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id } = await ctx.params;
  return repondre(() => Promise.resolve(lireLaBibleDeLaSerie(id)));
}
