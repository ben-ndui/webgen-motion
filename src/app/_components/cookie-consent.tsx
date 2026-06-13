"use client";

import { useEffect, useState } from "react";
import { isWebPublic, getConsent, setConsent } from "@/lib/consent";

/**
 * Bannière de consentement analytics (opt-in ePrivacy/RGPD).
 *
 * - N'apparaît que sur le web public (jamais dans l'app desktop) et
 *   seulement tant que le choix n'a pas été fait.
 * - Aucun event PostHog n'est émis tant que l'user n'a pas accepté
 *   (le PostHogProvider attend `consent === "granted"`).
 * - Langage visuel maison : noir & blanc strict, mono uppercase, sobre.
 */
export default function CookieConsent() {
  // Démarre caché ; on décide côté client (SSR ne connaît ni le contexte
  // ni le localStorage).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isWebPublic() && getConsent() === "unknown") setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(consent: "granted" | "denied") {
    setConsent(consent);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement à la mesure d'audience"
      data-wm-id="consent.banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-surface/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3.5">
        <div className="max-w-2xl">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
            Mesure d&apos;audience
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            On aimerait comprendre comment tu utilises le site (pages vues,
            clics) via PostHog, hébergé en Europe. Aucune mesure tant que tu
            n&apos;as pas accepté.{" "}
            <a
              href="/confidentialite"
              className="text-faint underline underline-offset-2 hover:text-muted transition-colors"
            >
              En savoir plus
            </a>
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            data-wm-id="consent.refuse"
            className="px-4 py-2 text-sm font-medium text-ink border border-line-strong hover:bg-bg-sunken transition-colors"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            data-wm-id="consent.accept"
            className="px-4 py-2 text-sm font-medium bg-ink text-bg hover:opacity-90 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
