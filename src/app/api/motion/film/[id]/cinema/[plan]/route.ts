import { NextRequest, NextResponse } from "next/server";

import { type ReponseDuPlan, genererUnPlan, suivreLePlan } from "@/lib/cinema/generation";
import { isFeatureEnabled } from "@/lib/edition";

/**
 * Le cinéma IA d'un film (docs/FILM-CINEMA-IA.md), un plan à la fois.
 *
 * POST /api/motion/film/<id>/cinema/<plan> — lance la génération (payante).
 * GET  /api/motion/film/<id>/cinema/<plan> — fait UN pas de suivi ; la page
 *   l'appelle toutes les quelques secondes jusqu'à « pret » ou « refuse ».
 *
 * Réponse : { plan: { etat, … }, budget: { utilises, plafond, qualite,
 * coutParPlanUsd } }, ou { erreur } avec le statut.
 */
type Contexte = { params: Promise<{ id: string; plan: string }> };

function studioRequis(): NextResponse {
  return NextResponse.json(
    { error: "studio-required", erreur: "Le cinéma IA est une fonctionnalité Studio Edition." },
    { status: 403 },
  );
}

// Un registre illisible lève une erreur qui dit quoi faire : elle remonte
// telle quelle plutôt qu'en « Internal Server Error ».
async function repondre(travail: () => Promise<ReponseDuPlan>): Promise<NextResponse> {
  try {
    return enReponse(await travail());
  } catch (erreur) {
    return NextResponse.json({ erreur: (erreur as Error).message }, { status: 500 });
  }
}

function enReponse(resultat: ReponseDuPlan): NextResponse {
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ plan: resultat.plan, budget: resultat.budget }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_req: NextRequest, ctx: Contexte) {
  if (!isFeatureEnabled("cinema-ia")) return studioRequis();
  const { id, plan } = await ctx.params;
  return repondre(() => genererUnPlan(id, plan));
}

export async function GET(_req: NextRequest, ctx: Contexte) {
  if (!isFeatureEnabled("cinema-ia")) return studioRequis();
  const { id, plan } = await ctx.params;
  return repondre(() => suivreLePlan(id, plan));
}
