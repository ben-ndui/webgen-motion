"use client";

/**
 * Pont token desktop. Quand l'app tourne dans la coque Tauri, le shell
 * Rust injecte `WEBGEN_DESKTOP_TOKEN` dans l'environnement du serveur
 * Next ; le layout racine l'expose au DOM via une balise
 * `<meta name="webgen-desktop-token">`. Ce composant lit ce token et
 * patche `window.fetch` pour ajouter le header `x-webgen-desktop-token`
 * sur les seules requêtes same-origin vers `/api/motion/**`.
 *
 * Objectif : faire fonctionner la couche token de la garde server-side
 * SANS toucher aux dizaines d'appels `fetch` existants.
 *
 * Non-breaking :
 *   - En dev / web (pas de meta token) → no-op total, fetch intact.
 *   - Token lu paresseusement à chaque appel (timing d'injection du
 *     meta sans importance).
 *   - Patch idempotent + strictement limité à `/api/motion/`.
 */

const PATCH_FLAG = "__webgenMotionFetchPatched__";
const TOKEN_HEADER = "x-webgen-desktop-token";

function readToken(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="webgen-desktop-token"]',
  );
  const v = meta?.content?.trim();
  return v ? v : null;
}

function isMotionRequest(input: RequestInfo | URL): boolean {
  try {
    let path: string;
    if (typeof input === "string") {
      path = input.startsWith("/")
        ? input
        : new URL(input, window.location.origin).pathname;
    } else if (input instanceof URL) {
      path = input.pathname;
    } else {
      path = new URL(input.url, window.location.origin).pathname;
    }
    return path.startsWith("/api/motion/");
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  if (!w[PATCH_FLAG]) {
    const original = window.fetch.bind(window);
    window.fetch = function patchedFetch(input, init) {
      try {
        const token = readToken();
        if (token && isMotionRequest(input)) {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined),
          );
          headers.set(TOKEN_HEADER, token);
          return original(input, { ...init, headers });
        }
      } catch {
        // En cas de pépin, on retombe sur le fetch d'origine intact.
      }
      return original(input, init);
    } as typeof window.fetch;
    w[PATCH_FLAG] = true;
  }
}

/** Composant inerte : tout le travail se fait au chargement du module. */
export default function DesktopTokenBridge(): null {
  return null;
}
