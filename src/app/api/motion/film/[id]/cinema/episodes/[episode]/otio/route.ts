import { readFileSync } from "node:fs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { exporterLEpisodeEnOtio } from "@/lib/cinema/export-otio-episode";
import { isFeatureEnabled } from "@/lib/edition";

/**
 * POST /api/motion/film/<id>/cinema/episodes/<episode>/otio — { declinaison } :
 * l'épisode monté en timeline .otio (DaVinci Resolve, Premiere), en
 * téléchargement. Studio Edition (flag `otio-export`), comme l'export des
 * vidéos produit.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; episode: string }> }) {
  if (!isFeatureEnabled("otio-export")) {
    return NextResponse.json(
      { error: "studio-required", erreur: "L'export vers DaVinci Resolve et Premiere est une fonctionnalité Studio Edition." },
      { status: 403 },
    );
  }
  const { id, episode } = await ctx.params;
  let corps: { declinaison?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const declinaison = typeof corps?.declinaison === "string" ? corps.declinaison : "";
  try {
    const resultat = exporterLEpisodeEnOtio(id, declinaison, episode);
    if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
    return new NextResponse(new Uint8Array(readFileSync(resultat.chemin)), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${resultat.nomDuFichier}"`,
        "X-Logo-Inclus": resultat.logoInclus ? "oui" : "non",
        // Le fichier est AUSSI sur le disque : l'écran dit où, si le
        // téléchargement est bloqué par la fenêtre de l'app.
        "X-Chemin-Otio": encodeURIComponent(resultat.chemin),
        "Cache-Control": "no-store",
      },
    });
  } catch (erreur) {
    return NextResponse.json({ erreur: (erreur as Error).message }, { status: 500 });
  }
}
