"use client";

import { useEffect } from "react";
import { isWebPublic, getConsent, CONSENT_EVENT } from "@/lib/consent";

/**
 * Google Ads (gtag.js) — chargé UNIQUEMENT sur le web public et en
 * **Consent Mode v2** : tout est refusé par défaut (aucun cookie pub posé),
 * et activé seulement quand l'utilisateur accepte la bannière cookies.
 * Conforme RGPD/ePrivacy, tout en gardant la modélisation de conversion
 * recommandée par Google. Jamais chargé dans l'app desktop.
 */
export const GOOGLE_ADS_ID = "AW-18237069275";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let loaded = false;

export default function GoogleAds(): null {
  useEffect(() => {
    if (loaded || !isWebPublic()) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // Pattern officiel gtag.js : on push l'objet `arguments` tel quel.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };

    // Refus par défaut (RGPD) — pas de cookie tant que pas de consentement.
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ADS_ID);

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.appendChild(s);

    const grant = () => {
      if (getConsent() !== "granted") return;
      window.gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      });
    };
    grant(); // visiteur déjà consentant (visite suivante)
    window.addEventListener(CONSENT_EVENT, grant);
    return () => window.removeEventListener(CONSENT_EVENT, grant);
  }, []);

  return null;
}
