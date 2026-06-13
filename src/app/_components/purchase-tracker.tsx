"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Event de conversion côté client, monté sur /thanks (succès post-achat).
 *
 * - Complète le funnel PostHog (visite → download → checkout_start →
 *   purchase_completed) côté navigateur.
 * - Point d'ancrage pour les tags de conversion publicitaires (Google Ads,
 *   Meta) : c'est ici qu'on pose le pixel quand l'ID de conversion existe.
 * - Refresh-safe : dédup par session Stripe (un seul event par achat).
 */
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
    // 👉 SEA : poser ici le tag de conversion quand l'ID est dispo, p.ex.
    //    (window as any).gtag?.("event", "conversion", {
    //      send_to: "AW-XXXXXXXXXX/abcdEFGhij",
    //    });
  }, [sessionId]);
  return null;
}
