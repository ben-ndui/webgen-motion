import { NextRequest, NextResponse } from "next/server";

import { proposerDesDecors } from "@/lib/formats/proposer-un-decor";

/**
 * POST /api/motion/formats/<id>/fond/proposer — Claude lit les paroles du
 * karaoké et propose trois décors. Rien n'est enregistré : l'artiste choisit.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const reponse = await proposerDesDecors(id);
  if (!reponse.ok) return NextResponse.json({ erreur: reponse.raison }, { status: reponse.statut });
  return NextResponse.json({ propositions: reponse.propositions });
}
