import { NextRequest, NextResponse } from "next/server";

import { enregistrerFilm } from "@/lib/film-ecriture";

/**
 * PUT /api/motion/film/<id> — enregistre la fiche envoyée par l'éditeur.
 * Une fiche incomplète s'enregistre aussi : la réponse liste ses erreurs.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let corps: { fiche?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const resultat = enregistrerFilm(id, corps?.fiche);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ erreurs: resultat.erreurs });
}
