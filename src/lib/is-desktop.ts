/**
 * Detects the GEN MOTION desktop runtime (Tauri webview) vs the web
 * vitrine (a normal browser). The pipeline is local-only, so the landing
 * offers "Ouvrir le studio" (→ /dashboard) on desktop and "Télécharger"
 * on the web. Tauri v2 injects `__TAURI_INTERNALS__` (v1 used `__TAURI__`)
 * into the window. Client-only — returns false during SSR.
 */
export function isDesktopRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}
