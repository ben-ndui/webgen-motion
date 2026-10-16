import { NextResponse } from "next/server";

import { lireLesReleases } from "@/lib/releases/lire-les-releases";
import { MOTIFS_PAR_PLATEFORME, estUnePlateforme, fichierPour, releasePour } from "@/lib/releases/release-par-plateforme";

/**
 * Route /api/download/[platform] — Sprint 14 direct download UX.
 *
 * Au lieu de rediriger l'utilisateur vers la page GitHub release (où
 * il doit chercher l'asset dans la liste), cette route fetch
 * l'API GitHub Releases, trouve l'asset matching le pattern platform,
 * et redirige 302 directement vers le `browser_download_url`.
 *
 * La release choisie est la plus récente qui a le fichier de la plateforme
 * (`src/lib/releases/`) : une release partielle (0.7.0, Mac seulement) ne
 * casse pas les téléchargements des autres.
 *
 * Plateformes supportées (mappées par regex sur le filename asset) :
 *   /api/download/macos-arm64   → aarch64.dmg
 *   /api/download/macos-intel   → x86_64.dmg / x64.dmg
 *   /api/download/macos         → arm64 si dispo, sinon intel (fallback)
 *   /api/download/windows       → .msi ou .exe
 *   /api/download/linux-appimage → .AppImage
 *   /api/download/linux-deb     → .deb
 *
 * Cache : ISR 5 min (genmotion.app Vercel CDN), suffisant pour
 * absorber un download burst sans hit GitHub à chaque click.
 */
export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!estUnePlateforme(platform)) {
    return NextResponse.json(
      { error: `Unknown platform "${platform}". Supported: ${Object.keys(MOTIFS_PAR_PLATEFORME).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const lecture = await lireLesReleases("genmotion.app/download");
    if (!lecture.ok) return NextResponse.json({ error: lecture.raison }, { status: 502 });
    // La plus récente release qui a CE fichier : une release partielle ne prive personne.
    const release = releasePour(lecture.releases, platform);
    const fichier = release ? fichierPour(release, platform) : null;
    if (!fichier) {
      return NextResponse.json({ error: `No ${platform} asset found in published releases` }, { status: 404 });
    }
    return NextResponse.redirect(fichier.browser_download_url, {
      status: 302,
      headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
