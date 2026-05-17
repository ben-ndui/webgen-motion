import { NextResponse } from "next/server";

/**
 * Route /api/version — Sprint 12 update checker.
 *
 * Retourne la latest release publique du repo ben-ndui/webgen-motion
 * en interrogeant l'API GitHub. Consommé par <UpdateChecker /> qui
 * tourne dans l'app desktop (Tauri / dev local) pour proposer une
 * mise à jour quand une nouvelle version est dispo.
 *
 * Response shape :
 *   {
 *     latest: "0.2.0",                       // tag name sans le 'v'
 *     releaseUrl: "https://github.com/.../tag/v0.2.0",
 *     downloadUrl: "https://github.com/.../releases/latest",
 *     notes: "...",                          // body markdown tronqué
 *     publishedAt: "2026-05-17T11:45:40Z",
 *     assets: [{ name, downloadUrl, size }]  // .dmg / .msi / .AppImage
 *   }
 *
 * Cache : Vercel CDN 5 min via Cache-Control. GitHub API rate-limit
 * 60 req/h non-auth → suffisant si bien caché.
 */
export const runtime = "nodejs";
export const revalidate = 300; // 5 min

const REPO = "ben-ndui/webgen-motion";

export async function GET() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "genmotion.app/version-check",
        },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub API ${res.status}` },
        { status: res.status, headers: { "cache-control": "public, max-age=60" } },
      );
    }
    const data = (await res.json()) as {
      tag_name: string;
      html_url: string;
      published_at: string;
      body: string;
      assets: Array<{ name: string; browser_download_url: string; size: number }>;
    };

    const tag = data.tag_name.replace(/^v/, "");
    return NextResponse.json(
      {
        latest: tag,
        releaseUrl: data.html_url,
        downloadUrl: `https://github.com/${REPO}/releases/latest`,
        notes: data.body ? data.body.slice(0, 800) : "",
        publishedAt: data.published_at,
        assets: data.assets.map((a) => ({
          name: a.name,
          downloadUrl: a.browser_download_url,
          size: a.size,
        })),
      },
      {
        headers: {
          "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500, headers: { "cache-control": "public, max-age=60" } },
    );
  }
}
