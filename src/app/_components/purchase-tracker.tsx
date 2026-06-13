"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { GOOGLE_ADS_ID } from "./google-ads";

/**
 * Event de conversion côté client, monté sur /thanks (succès post-achat).
 *
 * - Complète le funnel PostHog (visite → download → checkout_start →
 *   purchase_completed) côté navigateur.
 * - Déclenche la conversion Google Ads (gtag) — respecte le Consent Mode
 *   posé par <GoogleAds/> (pas de cookie pub sans consentement).
 * - Refresh-safe : dédup par session Stripe (un seul event par achat).
 */
// Libellé de conversion Google Ads (Objectifs → Conversions → [action] →
// balise d'événement : `send_to: "AW-…/XXXX"` → coller le XXXX ici).
// Vide tant que non fourni → la conversion ne se déclenche pas.
const ADS_CONVERSION_LABEL: string = "";
export default function PurchaseTracker({
  sessionId,
}: {
  sessionId?: string;
}) {
  useEffect(() => {
    const key = sessionId ? `wgm-purchase-${sessionId}` : "wgm-purchase";
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sessionStorage indispo : on émet quand même */
    }
    track(
      "purchase_completed",
      sessionId ? { stripe_session: sessionId } : undefined,
    );
    // Conversion Google Ads — uniquement quand le libellé est fourni.
    if (ADS_CONVERSION_LABEL && typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "conversion", {
        send_to: `${GOOGLE_ADS_ID}/${ADS_CONVERSION_LABEL}`,
        ...(sessionId ? { transaction_id: sessionId } : {}),
      });
    }
  }, [sessionId]);
  return null;
}
