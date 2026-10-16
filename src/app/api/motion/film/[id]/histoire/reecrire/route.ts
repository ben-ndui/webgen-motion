import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { estNomSur } from "@/lib/film-store";
import { reecrireUneSection } from "@/lib/histoire/reecrire-une-section";

/**
 * POST /api/motion/film/<id>/histoire/reecrire — { langue, section,
 * consigne?, aEviter? } : Claude propose une section de « Ton histoire ».
 * Réponse : { champs, aEcrireSoiMeme }, PAS enregistrée. Quelques centimes, sur ta clé.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!estNomSur(id)) return NextResponse.json({ erreur: "Film invalide" }, { status: 400 });
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  try {
    const reponse = await reecrireUneSection(id, corps);
    if (!reponse.ok) return NextResponse.json({ erreur: reponse.raison }, { status: reponse.statut });
    return NextResponse.json({ champs: reponse.champs, aEcrireSoiMeme: reponse.aEcrireSoiMeme }, { headers: { "Cache-Control": "no-store" } });
  } catch (erreur) {
    return NextResponse.json({ erreur: (erreur as Error).message }, { status: 500 });
  }
}
