import { NextResponse } from "next/server";
import { ensureChromium, ChromiumError } from "@/lib/chromium";

export const runtime = "nodejs";
// Le téléchargement (~150 Mo) peut être long : on lève la limite par défaut.
export const maxDuration = 300;

/**
 * Télécharge Chrome-for-Testing si nécessaire (idempotent : no-op si déjà
 * présent / Chrome système détecté). Appelé par le wizard de setup pour
 * pré-installer avant la 1ère capture. Couvert par la garde desktop-only.
 */
export async function POST() {
  try {
    const resolved = await ensureChromium();
    return NextResponse.json({
      ok: true,
      source: resolved.source,
      path: resolved.path,
    });
  } catch (e) {
    const message =
      e instanceof ChromiumError ? e.message : (e as Error).message;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
