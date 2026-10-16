import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLocalHostname } from "@/lib/server/desktop-guard";

/**
 * GET /api/desktop/jeton — le jeton de session de l'app de bureau, pour une
 * page qui ne l'a pas dans son en-tête. L'accueil est une page STATIQUE
 * (construite sans le jeton, qui naît à chaque lancement) : entrer dans
 * l'app par l'accueil laissait l'interface sans jeton, et TOUS les appels
 * /api/motion étaient refusés (« La création a échoué », 0.7.0 locale).
 *
 * Hors de /api/motion (la garde exigerait le jeton qu'on vient chercher).
 * Protégée autrement : hôte local seulement (pas de rebinding DNS), même
 * origine seulement, et un autre site ne peut pas lire la réponse (pas de CORS).
 * Sur le web (pas de jeton), répond { jeton: null }.
 */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const jeton = process.env.WEBGEN_DESKTOP_TOKEN || null;
  const sansCache = { "Cache-Control": "no-store" };
  if (!jeton) return NextResponse.json({ jeton: null }, { headers: sansCache });
  if (!isLocalHostname(req.headers.get("host"))) return NextResponse.json({ jeton: null }, { status: 403, headers: sansCache });
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ jeton: null }, { status: 403, headers: sansCache });
  return NextResponse.json({ jeton }, { headers: sansCache });
}
