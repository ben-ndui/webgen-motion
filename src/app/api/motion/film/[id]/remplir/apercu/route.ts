import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";

import { cheminDUnApercu } from "@/lib/site/apercus-du-remplissage";

/**
 * GET /api/motion/film/<id>/remplir/apercu?n=3 — la 3e capture prise par
 * « Remplir depuis ton site », pour la montrer pendant qu'il travaille.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const chemin = cheminDUnApercu(id, req.nextUrl.searchParams.get("n"));
  if (!chemin) return NextResponse.json({ erreur: "Aperçu introuvable" }, { status: 404 });
  return new NextResponse(readFileSync(chemin), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
