/**
 * Garde server-side « desktop-only / localhost » pour les routes du
 * pipeline (`/api/motion/**`).
 *
 * Pourquoi : ces routes spawnent des process (Puppeteer, ffmpeg,
 * Remotion, tsx) et lisent/écrivent le filesystem local. Elles ne
 * doivent JAMAIS être exécutables :
 *   - depuis le déploiement web public (genmotion.app sur Vercel) ;
 *   - depuis une origine distante / un autre site (CSRF, DNS-rebind).
 *
 * Modèle de menace & défenses (toutes appliquées, défense en
 * profondeur) :
 *   1. Public web → refus total. Le même codebase est déployé sur
 *      Vercel pour la vitrine ; on coupe net le pipeline là-bas au
 *      lieu de dépendre de « les scripts ne sont pas tracés » (défense
 *      par accident, cf. REVUE-TECHNIQUE.md).
 *   2. Host allow-list (localhost / 127.0.0.1 / ::1 / *.localhost) →
 *      défait le DNS-rebinding : un site malveillant qui résout son
 *      domaine vers 127.0.0.1 envoie quand même `Host: attacker.com`.
 *   3. Origin allow-list → défait le CSRF cross-site : un fetch depuis
 *      un autre site porte un `Origin` non-local.
 *   4. Token partagé (optionnel) injecté par le shell Tauri via
 *      `WEBGEN_DESKTOP_TOKEN` → enforced UNIQUEMENT s'il est présent
 *      (dégradation propre en dev / self-host). Le client le renvoie
 *      via le header `x-webgen-desktop-token` (cf. desktop-token-bridge).
 *
 * Ce module est **pur** (aucun accès I/O) pour être testable. Le
 * middleware (`src/middleware.ts`) lit la requête et l'environnement
 * puis délègue ici.
 */

/** Header par lequel le webview desktop renvoie le token de session. */
export const DESKTOP_TOKEN_HEADER = "x-webgen-desktop-token";

/** Hostnames considérés locaux (sans le port). */
const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
  "0.0.0.0",
  // Tauri v2 webview (Windows : http://tauri.localhost ; macOS/Linux
  // chargent ici le sidecar Node en http://127.0.0.1:<port>).
  "tauri.localhost",
]);

/** Retire le port d'un Host/hostname (`localhost:3000` → `localhost`). */
function stripPort(hostHeader: string): string {
  const h = hostHeader.trim().toLowerCase();
  // IPv6 littéral : `[::1]:3000` → `[::1]`.
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end === -1 ? h : h.slice(0, end + 1);
  }
  const colon = h.indexOf(":");
  return colon === -1 ? h : h.slice(0, colon);
}

/** Un hostname est-il local ? (`*.localhost` inclus — RFC 6761.) */
export function isLocalHostname(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false;
  const host = stripPort(hostHeader);
  if (LOCAL_HOSTNAMES.has(host)) return true;
  // n'importe quel sous-domaine `.localhost` résout en loopback.
  return host.endsWith(".localhost");
}

/** Une origine (`http://localhost:3000`, `tauri://localhost`, …) est-elle locale ? */
export function isLocalOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const o = origin.trim().toLowerCase();
  // Protocole natif Tauri (macOS/Linux) : `tauri://localhost`.
  if (o.startsWith("tauri://")) return true;
  try {
    const url = new URL(o);
    return isLocalHostname(url.host);
  } catch {
    return false;
  }
}

/** Détecte un runtime web public (Vercel ou flag explicite). */
export function isPublicWebRuntime(
  env: Record<string, string | undefined>,
): boolean {
  if (env.WEBGEN_PUBLIC_WEB === "1") return true;
  if (env.WEBGEN_DISABLE_MOTION_API === "1") return true;
  // Vercel positionne VERCEL="1" sur tous les runtimes (build + edge +
  // serverless). Présence = déploiement vitrine, pas la machine locale.
  if (env.VERCEL === "1" || env.VERCEL === "true") return true;
  if (env.VERCEL_ENV) return true;
  return false;
}

export interface MotionAccessInput {
  /** Header `Host` de la requête. */
  host: string | null | undefined;
  /** Header `Origin` (peut être absent sur une navigation directe). */
  origin: string | null | undefined;
  /** True si on tourne en web public (Vercel / flag). */
  isPublicWeb: boolean;
  /** Token attendu (env `WEBGEN_DESKTOP_TOKEN`). Vide/absent = couche désactivée. */
  expectedToken?: string | null;
  /** Token fourni par le client (header ou cookie). */
  providedToken?: string | null;
}

export interface MotionAccessDecision {
  allow: boolean;
  status: number;
  /** Identifiant stable de la raison (pour logs/tests). */
  reason:
    | "ok"
    | "public-web"
    | "non-local-host"
    | "cross-origin"
    | "missing-token"
    | "bad-token";
}

/**
 * Décision d'accès pour une requête `/api/motion/**`. Pure : ne touche
 * ni au réseau ni au FS. Le middleware mappe le résultat sur une
 * Response.
 */
export function evaluateMotionAccess(
  input: MotionAccessInput,
): MotionAccessDecision {
  // 1. Web public → jamais de pipeline.
  if (input.isPublicWeb) {
    return { allow: false, status: 403, reason: "public-web" };
  }

  // 2. Host doit être local (défait le DNS-rebinding).
  if (!isLocalHostname(input.host)) {
    return { allow: false, status: 403, reason: "non-local-host" };
  }

  // 3. Si une Origin est présente, elle doit être locale (défait le
  //    CSRF cross-site). Une navigation/serveur sans Origin passe.
  if (input.origin != null && input.origin !== "" && !isLocalOrigin(input.origin)) {
    return { allow: false, status: 403, reason: "cross-origin" };
  }

  // 4. Token partagé — enforced seulement s'il est configuré côté serveur.
  const expected = input.expectedToken?.trim();
  if (expected) {
    const provided = input.providedToken?.trim();
    if (!provided) {
      return { allow: false, status: 403, reason: "missing-token" };
    }
    if (provided !== expected) {
      return { allow: false, status: 403, reason: "bad-token" };
    }
  }

  return { allow: true, status: 200, reason: "ok" };
}
