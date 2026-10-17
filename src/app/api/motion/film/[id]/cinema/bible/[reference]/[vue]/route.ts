import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { estUneVue } from "@/lib/cinema/bible/etat";
import { genererUneImageDeLaBible } from "@/lib/cinema/bible/generation";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/bible/<reference>/<vue> — génère cette
 * vue de la référence (Gemini image, ~0,05 $) et la cite dans bible.json.
 * Réponse : { fichier: "cinema/bible/<reference>/<vue>-v<n>.jpg" }.
 */
type Contexte = { params: Promise<{ id: string; reference: string; vue: string }> };

export async function POST(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, reference, vue } = await ctx.params;
  if (!estUneVue(vue)) return NextResponse.json({ erreur: `Vue inconnue : « ${vue} »` }, { status: 400 });
  return repondre(() => genererUneImageDeLaBible(id, reference, vue));
}
