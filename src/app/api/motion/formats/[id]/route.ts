import { NextRequest, NextResponse } from "next/server";

import { erreursDuProjet } from "@/lib/formats/catalogue";
import { enregistrerProjet, lireProjetBrut } from "@/lib/formats/format-loader";

/** GET /api/motion/formats/<id> — le projet brut (même invalide) et ses erreurs, pour l'éditeur. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projet = lireProjetBrut(id);
  if (projet === null) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  return NextResponse.json({ projet, erreurs: erreursDuProjet(projet) }, { headers: { "Cache-Control": "no-store" } });
}

/** PUT /api/motion/formats/<id> — { projet } : enregistré même incomplet, la réponse liste ses erreurs. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let corps: { projet?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const resultat = enregistrerProjet(id, corps?.projet);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ erreurs: resultat.erreurs });
}
