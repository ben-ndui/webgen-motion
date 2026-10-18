import type { NextRequest } from "next/server";

import { validerUneReferenceDeLaBible } from "@/lib/cinema/bible/actions";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/bible/<reference>/valider — fige la
 * référence : c'est elle, et elle seule, qui part chez Veo.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string; reference: string }> }) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, reference } = await ctx.params;
  return repondre(() => Promise.resolve(validerUneReferenceDeLaBible(id, reference)));
}
