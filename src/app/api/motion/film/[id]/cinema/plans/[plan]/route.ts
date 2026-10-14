import type { NextRequest } from "next/server";

import { genererUnPlan, suivreLePlan } from "@/lib/cinema/generation";
import { repondre, studioRequis } from "@/lib/cinema/reponse-http";

/**
 * Un plan de la série d'un film (docs/FILM-CINEMA-IA.md).
 *
 * POST /api/motion/film/<id>/cinema/plans/<plan> — lance la génération (payante).
 * GET  /api/motion/film/<id>/cinema/plans/<plan> — fait UN pas de suivi ; la
 *   page l'appelle toutes les quelques secondes jusqu'à « pret » ou « refuse ».
 *
 * Réponse : { plan: { etat, … }, budget: { utilises, plafond },
 * modele: { qualite, pourquoi, coutUsd } }, ou { erreur } avec le statut.
 */
type Contexte = { params: Promise<{ id: string; plan: string }> };

export async function POST(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan } = await ctx.params;
  return repondre(() => genererUnPlan(id, plan));
}

export async function GET(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, plan } = await ctx.params;
  return repondre(() => suivreLePlan(id, plan));
}
