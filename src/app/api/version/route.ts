import { NextResponse } from "next/server";

import { lireLesReleases } from "@/lib/releases/lire-les-releases";
import { estUnePlateforme, plateformeDeLAgent, releasePour } from "@/lib/releases/release-par-plateforme";

/**
 * Route /api/version : la dernière version que CETTE plateforme peut
 * installer. Consommé par <UpdateChecker /> dans l'app de bureau.
 *
 * Plateforme : `?plateforme=` (macos-arm64, windows…), sinon lue dans
 * l'agent du navigateur (les apps 0.6.0 interrogent sans paramètre). Une
 * release partielle (0.7.0 : Mac Apple Silicon seulement) n'est donc pas
 * annoncée à un Windows qui ne pourrait pas l'installer (16/10/2026).
 *
 * Response shape :
 *   { latest: "0.7.0", releaseUrl, downloadUrl, notes, publishedAt, assets: [{ name, downloadUrl, size }] }
 */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const demandee = new URL(req.url).searchParams.get("plateforme");
  const plateforme = estUnePlateforme(demandee) ? demandee : plateformeDeLAgent(req.headers.get("user-agent"));
  // La réponse dépend de qui demande : pas de cache partagé entre plateformes.
  const cache = { "cache-control": "private, max-age=300", vary: "User-Agent" };
  try {
    const lecture = await lireLesReleases("genmotion.app/version-check");
    if (!lecture.ok) return NextResponse.json({ error: lecture.raison }, { status: lecture.statut, headers: { "cache-control": "public, max-age=60" } });
    const release = releasePour(lecture.releases, plateforme);
    if (!release) return NextResponse.json({ error: `No published release for ${plateforme ?? "this platform"}` }, { status: 404, headers: cache });
    return NextResponse.json(
      {
        latest: release.tag_name.replace(/^v/, ""),
        releaseUrl: release.html_url,
        downloadUrl: release.html_url,
        notes: release.body ? release.body.slice(0, 800) : "",
        publishedAt: release.published_at,
        assets: release.assets.map((a) => ({ name: a.name, downloadUrl: a.browser_download_url, size: a.size })),
      },
      { headers: cache },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: { "cache-control": "public, max-age=60" } });
  }
}
