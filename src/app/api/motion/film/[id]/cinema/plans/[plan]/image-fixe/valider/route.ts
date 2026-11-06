import type { NextRequest } from "next/server";

import { validerUneImageFixe } from "@/lib/cinema/plan-still";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/** POST /api/motion/film/<id>/cinema/plans/<plan>/image-fixe/valider — fige l'image : c'est elle, et elle seule, qui part animer. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string; plan: string }> }) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan } = await ctx.params;
  return repondre(() => Promise.resolve(validerUneImageFixe(id, plan)));
}
