import { NextResponse, type NextRequest } from "next/server";
import {
  DESKTOP_TOKEN_HEADER,
  evaluateMotionAccess,
  isPublicWebRuntime,
} from "@/lib/server/desktop-guard";

/**
 * Garde server-side du pipeline. Toutes les routes `/api/motion/**`
 * spawnent des process et touchent le FS local : elles ne doivent
 * tourner QUE dans le runtime desktop local (dev ou app Tauri),
 * jamais sur le web public ni cross-origin.
 *
 * La logique de décision est pure et testée dans
 * `src/lib/server/desktop-guard.ts`. Ici on se contente de lire la
 * requête + l'environnement et de mapper la décision sur une Response.
 *
 * Les routes Stripe (`/api/stripe/**`) NE sont PAS couvertes : le
 * webhook doit rester joignable publiquement sur Vercel.
 */
export function middleware(req: NextRequest): NextResponse {
  let decision;
  try {
    decision = evaluateMotionAccess({
      host: req.headers.get("host"),
      origin: req.headers.get("origin"),
      isPublicWeb: isPublicWebRuntime(process.env),
      expectedToken: process.env.WEBGEN_DESKTOP_TOKEN,
      providedToken:
        req.headers.get(DESKTOP_TOKEN_HEADER) ??
        req.cookies.get("webgen_desktop_token")?.value ??
        null,
    });
  } catch {
    // Fail-closed : sur ces routes sensibles, une erreur inattendue
    // de la garde bloque plutôt que d'ouvrir.
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!decision.allow) {
    return new NextResponse(
      JSON.stringify({ error: "Forbidden", reason: decision.reason }),
      {
        status: decision.status,
        headers: { "content-type": "application/json" },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  // Couvre uniquement le pipeline local. Stripe / version / download
  // restent publics.
  matcher: ["/api/motion/:path*"],
};
