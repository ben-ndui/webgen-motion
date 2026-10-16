import { NextResponse, type NextRequest } from "next/server";
import {
  DESKTOP_TOKEN_HEADER,
  evaluateMotionAccess,
  isLocalHostname,
  isPublicWebRuntime,
} from "@/lib/server/desktop-guard";

const COOKIE_DU_JETON = "webgen_desktop_token";

/**
 * Dans l'app de bureau, une page de l'interface pose le jeton dans un cookie :
 * les balises <video> et <img> qui lisent /api/motion ne passent pas par
 * fetch (ni par le pont du jeton), et la garde les refusait toutes — les
 * rendus et aperçus s'affichaient vides dans l'app installée (vu en
 * préparant la 0.7.0 ; présent depuis la garde de juin 2026).
 * HttpOnly, SameSite=Strict, hôte local seulement ; il vit dans la fenêtre
 * de l'app, pas dans le navigateur de la personne. Sur le web : rien.
 */
function poserLeJetonDeLaFenetre(req: NextRequest): NextResponse {
  const reponse = NextResponse.next();
  const jeton = process.env.WEBGEN_DESKTOP_TOKEN;
  if (!jeton || !isLocalHostname(req.headers.get("host"))) return reponse;
  if (req.cookies.get(COOKIE_DU_JETON)?.value === jeton) return reponse;
  reponse.cookies.set(COOKIE_DU_JETON, jeton, { httpOnly: true, sameSite: "strict", path: "/" });
  return reponse;
}

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
  if (!req.nextUrl.pathname.startsWith("/api/motion/")) return poserLeJetonDeLaFenetre(req);
  let decision;
  try {
    decision = evaluateMotionAccess({
      host: req.headers.get("host"),
      origin: req.headers.get("origin"),
      isPublicWeb: isPublicWebRuntime(process.env),
      expectedToken: process.env.WEBGEN_DESKTOP_TOKEN,
      providedToken:
        req.headers.get(DESKTOP_TOKEN_HEADER) ??
        req.cookies.get(COOKIE_DU_JETON)?.value ??
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
  // + les pages de l'interface du studio, où le cookie du jeton est posé
  // (l'accueil compris : l'app s'ouvre dessus). Le reste du site public
  // n'appelle pas le middleware.
  matcher: ["/api/motion/:path*", "/", "/dashboard/:path*", "/film/:path*", "/tour/:path*", "/compose/:path*", "/console/:path*", "/setup/:path*"],
};
