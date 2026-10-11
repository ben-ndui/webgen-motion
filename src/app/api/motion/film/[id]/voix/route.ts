import { NextRequest, NextResponse } from "next/server";

import { genererLesVoix } from "@/lib/film-voix";

/**
 * POST /api/motion/film/<id>/voix — génère les lignes de voix off écrites et
 * pas encore générées. { generees, erreurs } ; 412 si aucune voix n'est réglée.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const resultat = await genererLesVoix(id);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ generees: resultat.generees, erreurs: resultat.erreurs });
}
