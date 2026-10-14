import { NextResponse } from "next/server";

import { isFeatureEnabled } from "../edition";
import type { Refus } from "./lieux";

/**
 * Ce que les routes du cinéma ont en commun : la porte Studio, et la mise en
 * forme des réponses (succès sans cache, refus avec sa phrase).
 */
export function studioRequis(): NextResponse | null {
  if (isFeatureEnabled("cinema-ia")) return null;
  return NextResponse.json({ error: "studio-required", erreur: "Le cinéma IA est une fonctionnalité Studio Edition." }, { status: 403 });
}

// Un registre illisible lève une erreur qui dit quoi faire : elle remonte
// telle quelle plutôt qu'en « Internal Server Error ».
export async function repondre<T extends { ok: true }>(travail: () => Promise<T | Refus>): Promise<NextResponse> {
  try {
    const resultat = await travail();
    if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
    // `ok` sert au serveur ; le navigateur lit le statut HTTP.
    const corps: Record<string, unknown> = { ...resultat };
    delete corps.ok;
    return NextResponse.json(corps, { headers: { "Cache-Control": "no-store" } });
  } catch (erreur) {
    return NextResponse.json({ erreur: (erreur as Error).message }, { status: 500 });
  }
}
