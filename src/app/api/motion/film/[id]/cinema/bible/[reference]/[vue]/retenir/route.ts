import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { retenirUneVersionDeLaBible } from "@/lib/cinema/bible/actions";
import { estUneVue } from "@/lib/cinema/bible/etat";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/bible/<reference>/<vue>/retenir — { n } :
 * fait passer la version n de cette vue dans la bible (sans en générer).
 */
type Contexte = { params: Promise<{ id: string; reference: string; vue: string }> };

export async function POST(req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, reference, vue } = await ctx.params;
  if (!estUneVue(vue)) return NextResponse.json({ erreur: `Vue inconnue : « ${vue} »` }, { status: 400 });
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const n = (corps as { n?: unknown })?.n;
  if (typeof n !== "number" || !Number.isInteger(n)) return NextResponse.json({ erreur: "Numéro de version attendu" }, { status: 400 });
  return repondre(() => Promise.resolve(retenirUneVersionDeLaBible(id, reference, vue, n)));
}
