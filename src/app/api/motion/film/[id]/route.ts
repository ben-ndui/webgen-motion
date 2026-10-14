import { NextRequest, NextResponse } from "next/server";

import { garderLesChampsDuServeur } from "@/lib/cinema/champs-du-serveur";
import { enregistrerFilm, lireFicheBrute } from "@/lib/film-ecriture";
import { etatDeLEditeur } from "@/lib/film-editeur";

/** GET /api/motion/film/<id> — l'état complet de l'assistant (fiche, médias, textes à écrire). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const etat = etatDeLEditeur(id);
  if (!etat) return NextResponse.json({ erreur: "Film introuvable" }, { status: 404 });
  return NextResponse.json(etat, { headers: { "Cache-Control": "no-store" } });
}

/**
 * PUT /api/motion/film/<id> — enregistre la fiche envoyée par l'éditeur.
 * Une fiche incomplète s'enregistre aussi : la réponse liste ses erreurs.
 * Les vidéos et portraits de la série restent ceux du disque (le navigateur
 * ne les écrit jamais : voir champs-du-serveur.ts).
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let corps: { fiche?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const fiche = garderLesChampsDuServeur(corps?.fiche, lireFicheBrute(id));
  const resultat = enregistrerFilm(id, fiche);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ erreurs: resultat.erreurs });
}
