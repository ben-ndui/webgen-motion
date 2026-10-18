import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { deverrouillerUneReferenceDeLaBible } from "@/lib/cinema/bible/actions";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/bible/<reference>/deverrouiller —
 * { motif } : rend la référence modifiable de nouveau ; le motif reste dans
 * son journal.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; reference: string }> }) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, reference } = await ctx.params;
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const motif = (corps as { motif?: unknown })?.motif;
  if (typeof motif !== "string") return NextResponse.json({ erreur: "Motif attendu" }, { status: 400 });
  return repondre(() => Promise.resolve(deverrouillerUneReferenceDeLaBible(id, reference, motif)));
}
