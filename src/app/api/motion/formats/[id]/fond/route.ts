import { NextRequest, NextResponse } from "next/server";

import { studioRequis } from "@/lib/cinema/reponse-http";
import { lancerLeFond, suivreLeFond, type Version } from "@/lib/formats/fond-sur-mesure";

const version = (valeur: unknown): Version | null => (valeur === "long" || valeur === "court" ? valeur : null);

/**
 * POST /api/motion/formats/<id>/fond — { version } : lance la génération Veo du
 * décor sur mesure de ce format (réservée avant l'appel : jamais payée deux fois).
 * GET  /api/motion/formats/<id>/fond?version= — un pas de suivi ; range la vidéo prête.
 * Studio seulement (vidéo IA), comme la série.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const refus = studioRequis();
  if (refus) return refus;
  const { id } = await ctx.params;
  const corps = (await req.json().catch(() => ({}))) as { version?: unknown };
  const v = version(corps.version);
  if (!v) return NextResponse.json({ erreur: "version : long ou court" }, { status: 400 });
  const resultat = await lancerLeFond(id, v);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ etat: "en-cours", coutUsd: resultat.coutUsd });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const refus = studioRequis();
  if (refus) return refus;
  const { id } = await ctx.params;
  const v = version(req.nextUrl.searchParams.get("version"));
  if (!v) return NextResponse.json({ erreur: "version : long ou court" }, { status: 400 });
  const etat = await suivreLeFond(id, v);
  if ("ok" in etat) return NextResponse.json({ erreur: etat.raison }, { status: etat.statut });
  return NextResponse.json(etat, { headers: { "Cache-Control": "no-store" } });
}
