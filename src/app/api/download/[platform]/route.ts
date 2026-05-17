import { NextResponse } from "next/server";

/**
 * Route /api/download/[platform] — Sprint 14 direct download UX.
 *
 * Au lieu de rediriger l'utilisateur vers la page GitHub release (où
 * il doit chercher l'asset dans la liste), cette route fetch
 * l'API GitHub Releases, trouve l'asset matching le pattern platform,
 * et redirige 302 directement vers le `browser_download_url`.
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

const REPO = "ben-ndui/webgen-motion";
const PATTERNS: Record<string, RegExp[]> = {
  "macos-arm64": [/aarch64.*\.dmg$/i, /arm64.*\.dmg$/i],
  "macos-intel": [/x86_64.*\.dmg$/i, /x64.*\.dmg$/i],
  "macos": [/aarch64.*\.dmg$/i, /arm64.*\.dmg$/i, /x86_64.*\.dmg$/i, /\.dmg$/i],
  "windows": [/\.msi$/i, /setup.*\.exe$/i, /\.exe$/i],
  "linux-appimage": [/\.AppImage$/i],
  "linux-deb": [/\.deb$/i],
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const patterns = PATTERNS[platform];
  if (!patterns) {
    return NextResponse.json(
      { error: `Unknown platform "${platform}". Supported: ${Object.keys(PATTERNS).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "genmotion.app/download",
        },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub API ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      assets: Array<{ name: string; browser_download_url: string }>;
    };

    let asset: { name: string; browser_download_url: string } | undefined;
    for (const pattern of patterns) {
      asset = data.assets.find((a) => pattern.test(a.name));
      if (asset) break;
    }

    if (!asset) {
      return NextResponse.json(
        {
          error: `No ${platform} asset found in latest release`,
          available: data.assets.map((a) => a.name),
        },
        { status: 404 },
      );
    }

    return NextResponse.redirect(asset.browser_download_url, {
      status: 302,
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
