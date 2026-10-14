import { readFileSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";

import { plancheDuPlan } from "@/lib/cinema/planche-du-plan";

/**
 * GET /api/motion/film/<id>/cinema/plans/<plan>/planche — la planche contact
 * du plan (PNG, une image toutes les demi-secondes), pour choisir sa découpe.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; plan: string }> }) {
  const { id, plan } = await ctx.params;
  const resultat = plancheDuPlan(id, plan);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return new NextResponse(new Uint8Array(readFileSync(resultat.chemin)), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
