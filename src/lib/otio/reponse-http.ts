import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";

import { isFeatureEnabled } from "../edition";

/**
 * Ce que les routes d'export .otio ont en commun : la porte Studio, la
 * lecture du corps { declinaison }, et l'envoi du fichier en téléchargement.
 */
export function exportStudioRequis(): NextResponse | null {
  if (isFeatureEnabled("otio-export")) return null;
  return NextResponse.json(
    { error: "studio-required", erreur: "L'export vers DaVinci Resolve est une fonctionnalité Studio Edition." },
    { status: 403 },
  );
}

/** La déclinaison demandée, ou null si la requête est illisible. */
export async function lireLaDeclinaison(req: Request): Promise<string | null> {
  try {
    const corps = (await req.json()) as { declinaison?: unknown };
    return typeof corps?.declinaison === "string" ? corps.declinaison : "";
  } catch {
    return null;
  }
}

export function envoyerLaTimeline(chemin: string, nomDuFichier: string, entetes: Record<string, string> = {}): NextResponse {
  return new NextResponse(new Uint8Array(readFileSync(chemin)), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${nomDuFichier}"`,
      // Le fichier est AUSSI sur le disque : l'écran dit où, si le
      // téléchargement est bloqué par la fenêtre de l'app.
      "X-Chemin-Otio": encodeURIComponent(chemin),
      "Cache-Control": "no-store",
      ...entetes,
    },
  });
}
