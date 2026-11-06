import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { genererUneImageFixe, lireLesPlanches } from "@/lib/cinema/plan-still";
import { getFilmDir } from "@/lib/film-store";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/plans/<plan>/image-fixe — génère l'image
 * fixe du plan (PROMPT IMAGE FIXE), à valider avant de l'animer.
 * GET — sa fiche actuelle (versions, verrouillage).
 */
type Contexte = { params: Promise<{ id: string; plan: string }> };

export async function POST(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan } = await ctx.params;
  return repondre(() => genererUneImageFixe(id, plan));
}

export async function GET(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan } = await ctx.params;
  const fiche = lireLesPlanches(getFilmDir(id)).plans[plan];
  return NextResponse.json({ fiche: fiche ?? null }, { headers: { "Cache-Control": "no-store" } });
}
