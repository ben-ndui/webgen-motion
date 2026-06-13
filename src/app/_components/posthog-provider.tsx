"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

/**
 * Initialise PostHog **uniquement sur le web public** (genmotion.app).
 *
 * GARDES (le local-first est une promesse — on ne track jamais dans l'app) :
 *  - pas de clé `NEXT_PUBLIC_POSTHOG_KEY` → off (dev, builds sans analytics)
 *  - contexte Tauri (`window.__TAURI__`) → off (app desktop)
 *  - host localhost / 127.0.0.1 / tauri.localhost → off (app + dev local)
 *  - meta `webgen-desktop-token` présent → off (double sécurité shell desktop)
 *
 * Rendu : rien (null). Monté une fois dans le layout, capture les
 * pageviews à chaque changement de route (App Router = SPA).
 *
 * Note : `NEXT_PUBLIC_*` est inliné au build → après avoir posé la clé
 * sur Vercel, il faut un redeploy pour qu'elle prenne.
 */
function shouldEnable(): boolean {
  if (typeof window === "undefined") return false;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return false;
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

let initialized = false;

export default function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (initialized || !shouldEnable()) return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // capturé manuellement ci-dessous
      capture_pageleave: true,
    });
    initialized = true;
  }, []);

  // Pageview au 1er load (l'effet d'init ci-dessus a déjà posé `initialized`
  // avant que cet effet ne tourne) ET à chaque changement de route.
  // pathname seul (évite la dépendance useSearchParams qui imposerait un
  // <Suspense>) — suffisant pour le funnel.
  useEffect(() => {
    if (!initialized) return;
    posthog.capture("$pageview");
  }, [pathname]);

  return null;
}
