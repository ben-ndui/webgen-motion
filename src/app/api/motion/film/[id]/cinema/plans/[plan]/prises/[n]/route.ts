import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { retenirUnePrise, supprimerUnePrise } from "@/lib/cinema/prises/gestes";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST   /api/motion/film/<id>/cinema/plans/<plan>/prises/<n> — fait passer
 * la prise n dans l'épisode (la retient).
 * DELETE /api/motion/film/<id>/cinema/plans/<plan>/prises/<n> — la supprime
 * (jamais la retenue) et efface sa vidéo.
 * Réponse : { prises, plan } comme GET .../prises.
 */
type Contexte = { params: Promise<{ id: string; plan: string; n: string }> };

function lireLeNumero(brut: string): number | null {
  const n = Number(brut);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function DELETE(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan, n } = await ctx.params;
  const numero = lireLeNumero(n);
  if (numero === null) return NextResponse.json({ erreur: "Numéro de prise invalide" }, { status: 400 });
  return repondre(() => Promise.resolve(supprimerUnePrise(id, plan, numero)));
}

export async function POST(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan, n } = await ctx.params;
  const numero = lireLeNumero(n);
  if (numero === null) return NextResponse.json({ erreur: "Numéro de prise invalide" }, { status: 400 });
  return repondre(() => Promise.resolve(retenirUnePrise(id, plan, numero)));
}
