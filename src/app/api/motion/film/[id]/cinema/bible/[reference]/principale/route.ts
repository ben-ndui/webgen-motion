import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { choisirLaVuePrincipaleDeLaBible } from "@/lib/cinema/bible/actions";
import { estUneVue } from "@/lib/cinema/bible/etat";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/bible/<reference>/principale — { vue } :
 * choisit la vue envoyée à Veo pour cette référence.
 */
type Contexte = { params: Promise<{ id: string; reference: string }> };

export async function POST(req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, reference } = await ctx.params;
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const vue = (corps as { vue?: unknown })?.vue;
  if (!estUneVue(vue)) return NextResponse.json({ erreur: "Vue inconnue" }, { status: 400 });
  return repondre(() => Promise.resolve(choisirLaVuePrincipaleDeLaBible(id, reference, vue)));
}
