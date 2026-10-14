import type { NextRequest } from "next/server";

import { genererLePortrait } from "@/lib/cinema/generation-portrait";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/personnages/<personnage>/portrait —
 * génère le portrait de référence du personnage (~0,05 $) et le cite dans la
 * fiche. Réponse : { portrait: "cinema/personnages/<id>.jpg" }, ou { erreur }.
 */
type Contexte = { params: Promise<{ id: string; personnage: string }> };

export async function POST(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, personnage } = await ctx.params;
  return repondre(() => genererLePortrait(id, personnage));
}
