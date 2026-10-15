import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { exporterLEpisodeEnOtio } from "@/lib/cinema/export-otio-episode";
import { envoyerLaTimeline, exportStudioRequis, lireLaDeclinaison } from "@/lib/otio/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/episodes/<episode>/otio — { declinaison } :
 * l'épisode monté en timeline .otio (DaVinci Resolve), en téléchargement.
 * Studio Edition (flag `otio-export`), comme l'export des vidéos produit.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; episode: string }> }) {
  const porte = exportStudioRequis();
  if (porte) return porte;
  const { id, episode } = await ctx.params;
  const declinaison = await lireLaDeclinaison(req);
  if (declinaison === null) return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  try {
    const resultat = exporterLEpisodeEnOtio(id, declinaison, episode);
    if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
    return envoyerLaTimeline(resultat.chemin, resultat.nomDuFichier, { "X-Logo-Inclus": resultat.logoInclus ? "oui" : "non" });
  } catch (erreur) {
    return NextResponse.json({ erreur: (erreur as Error).message }, { status: 500 });
  }
}
