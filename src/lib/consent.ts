"use client";

/**
 * Consentement analytics (ePrivacy/RGPD) — partagé entre la bannière
 * cookie et le PostHogProvider.
 *
 * - PostHog n'est initialisé QU'APRÈS un consentement explicite (opt-in).
 * - `isWebPublic()` : gating commun — on ne montre la bannière / n'init
 *   l'analytics QUE sur le web public genmotion.app. Jamais dans l'app
 *   desktop (Tauri / localhost / meta desktop-token) ni en SSR.
 */
export type Consent = "granted" | "denied" | "unknown";

const KEY = "wgm-analytics-consent";
export const CONSENT_EVENT = "wgm-consent";

/** Vrai uniquement sur le web public (pas l'app desktop, pas le dev local). */
export function isWebPublic(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return false;
  const host = window.location.hostname;
  if (["localhost", "127.0.0.1", "0.0.0.0", "tauri.localhost"].includes(host)) {
    return false;
  }
  const meta = document.querySelector(
    'meta[name="webgen-desktop-token"]',
  ) as HTMLMetaElement | null;
  if (meta?.content) return false;
  return true;
}

export function getConsent(): Consent {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : "unknown";
  } catch {
    return "unknown";
  }
}

export function setConsent(consent: Exclude<Consent, "unknown">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, consent);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  } catch {
    /* localStorage indispo (mode privé strict) : on ignore */
  }
}
