import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { exporterLeFilmEnOtio } from "@/lib/film-export-otio";
import { envoyerLaTimeline, exportStudioRequis, lireLaDeclinaison } from "@/lib/otio/reponse-http";

/**
 * POST /api/motion/film/<id>/otio — { declinaison } : le film de marque en
 * timeline .otio (DaVinci Resolve), plans découpés dans le rendu, voix off et
 * musique sur leurs pistes. Studio Edition (flag `otio-export`).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const porte = exportStudioRequis();
  if (porte) return porte;
  const { id } = await ctx.params;
  const declinaison = await lireLaDeclinaison(req);
  if (declinaison === null) return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  try {
    const resultat = exporterLeFilmEnOtio(id, declinaison);
    if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
    return envoyerLaTimeline(resultat.chemin, resultat.nomDuFichier);
  } catch (erreur) {
    return NextResponse.json({ erreur: (erreur as Error).message }, { status: 500 });
  }
}
