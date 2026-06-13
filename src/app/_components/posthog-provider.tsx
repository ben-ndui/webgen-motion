"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { isWebPublic, getConsent, CONSENT_EVENT } from "@/lib/consent";

/**
 * Initialise PostHog **uniquement sur le web public** (genmotion.app) ET
 * **uniquement après consentement explicite** (opt-in, cf. CookieConsent).
 *
 * GARDES (le local-first est une promesse — on ne track jamais dans l'app) :
 *  - pas de clé `NEXT_PUBLIC_POSTHOG_KEY` → off
 *  - contexte non web-public (Tauri / localhost / meta desktop-token) → off
 *  - consentement non accordé → off (rien tant que l'user n'a pas accepté)
 *
 * Rendu : rien (null). Monté une fois dans le layout, capture les
 * pageviews à chaque changement de route (App Router = SPA).
 *
 * Note : `NEXT_PUBLIC_*` est inliné au build → après avoir posé la clé
 * sur Vercel, il faut un redeploy pour qu'elle prenne.
 */
function canInit(): boolean {
  return (
    isWebPublic() &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    getConsent() === "granted"
  );
}

let initialized = false;

export default function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const tryInit = (fromConsentClick: boolean) => {
      if (initialized || !canInit()) return;
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false, // capturé manuellement ci-dessous
        capture_pageleave: true,
      });
      initialized = true;
      // Consentement donné en cours de session (clic bannière) : le pathname
      // n'a pas changé → on capture le pageview ici. Au mount d'un user déjà
      // consentant, on laisse l'effet pathname le faire (évite le doublon).
      if (fromConsentClick) posthog.capture("$pageview");
    };
    tryInit(false);
    const onConsent = () => tryInit(true);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  // Pageview à chaque changement de route (une fois initialisé).
  // pathname seul (évite la dépendance useSearchParams qui imposerait un
  // <Suspense>) — suffisant pour le funnel.
  useEffect(() => {
    if (!initialized) return;
    posthog.capture("$pageview");
  }, [pathname]);

  return null;
}
