import { NextResponse } from "next/server";
import { detectMobileTools } from "@/lib/server/mobile-tools";

export const runtime = "nodejs";

/**
 * Statut des outils de capture mobile (Maestro / Java / adb / simctl) +
 * plateformes prêtes. Lu par l'UI (onglet Capture d'un tour mobile, modal
 * « Nouveau tour ») pour guider l'utilisateur au lieu d'échouer au runner.
 */
export async function GET() {
  return NextResponse.json(detectMobileTools(), {
    headers: { "Cache-Control": "no-store" },
  });
}
