"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";
import type { StudioPlan } from "@/lib/stripe-plans";

/**
 * Bouton qui kick le Stripe Checkout flow pour un plan donné (B.2/B.8).
 * Client component minimal : POST /api/stripe/checkout { plan }, récupère
 * l'URL Stripe-hosted, redirect window.location vers elle.
 *
 * `plan` défaut "lifetime" (rétro-compat du CTA d'origine). `rawClassName`
 * remplace le style Tailwind par défaut quand on veut câbler le bouton
 * dans le design CSS de la landing (classes .btn…).
 */
export default function BuyButton({
  className,
  rawClassName,
  label = "Acheter Studio Edition",
  variant = "primary",
  plan = "lifetime",
}: {
  className?: string;
  rawClassName?: string;
  label?: string;
  variant?: "primary" | "secondary";
  plan?: StudioPlan;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setErr(null);
    track("checkout_start", { source: "buy-button", plan, label });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErr(data.error ?? `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  const baseCls =
    variant === "primary"
      ? "inline-flex items-center gap-2 px-6 py-3.5 bg-ink text-bg text-sm font-medium hover:opacity-90 disabled:bg-line-strong disabled:cursor-not-allowed transition-colors"
      : "inline-flex items-center gap-2 px-5 py-3 border border-line-strong text-ink text-sm font-medium hover:bg-bg-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  // rawClassName → on adopte le style CSS de la landing (.btn…) tel quel.
  const isRaw = Boolean(rawClassName);

  return (
    <div className={isRaw ? "" : "inline-flex flex-col items-start gap-1"}>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className={isRaw ? rawClassName : `${baseCls} ${className ?? ""}`}
        data-wm-id={`buy.studio.${plan}`}
      >
        {loading ? "Redirection…" : label}
        {!isRaw && <ArrowUpRight className="w-4 h-4" />}
      </button>
      {err && (
        <span
          className={
            isRaw ? "tier-err" : "text-xs text-rose-700 mt-1"
          }
        >
          {err.includes("STRIPE")
            ? "Paiement bientôt disponible — Stripe pas encore configuré."
            : `Erreur : ${err}`}
        </span>
      )}
    </div>
  );
}
