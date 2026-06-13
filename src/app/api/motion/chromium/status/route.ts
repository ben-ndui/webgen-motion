import { NextResponse } from "next/server";
import { resolveChromiumExecutable, getChromiumCacheDir } from "@/lib/chromium";

export const runtime = "nodejs";

/**
 * État du navigateur Chromium : déjà résolu (env/système/cache) ou non.
 * Sert au wizard `/setup` pour décider d'afficher un bouton « télécharger »
 * avant la 1ère capture. Couvert par la garde desktop-only (middleware).
 */
export async function GET() {
  const resolved = await resolveChromiumExecutable();
  return NextResponse.json({
    available: resolved !== null,
    source: resolved?.source ?? null,
    path: resolved?.path ?? null,
    cacheDir: getChromiumCacheDir(),
  });
}
