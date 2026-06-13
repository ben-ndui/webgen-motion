"use client";

import posthog from "posthog-js";

/**
 * Émet un event PostHog. **No-op total** si PostHog n'est pas initialisé
 * — ce qui est le cas dans l'app desktop, en dev, et sur toute page sans
 * `NEXT_PUBLIC_POSTHOG_KEY` (cf. PostHogProvider qui décide de l'init).
 *
 * L'analytics ne doit JAMAIS casser l'UX : tout est avalé.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if ((posthog as unknown as { __loaded?: boolean }).__loaded) {
      posthog.capture(event, props);
    }
  } catch {
    /* swallow */
  }
}
