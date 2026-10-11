import { NextRequest, NextResponse } from "next/server";

import { enregistrerFilm } from "@/lib/film-ecriture";
import { etatDeLEditeur } from "@/lib/film-editeur";

/** GET /api/motion/film/<id> — l'état complet de l'assistant (fiche, médias, textes à écrire). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const etat = etatDeLEditeur(id);
  if (!etat) return NextResponse.json({ erreur: "Film introuvable" }, { status: 404 });
  return NextResponse.json(etat, { headers: { "Cache-Control": "no-store" } });
}

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
