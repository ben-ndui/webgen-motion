"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * Bouton qui kick le Stripe Checkout flow.
 * Client component minimal : POST /api/stripe/checkout, récupère
 * l'URL Stripe-hosted, redirect window.location vers elle.
 * Sprint 10 — checkout MVP one-time Studio Edition.
 */
export default function BuyButton({
  className,
  label = "Acheter Studio Edition · $49",
  variant = "primary",
}: {
  className?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
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

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className={`${baseCls} ${className ?? ""}`}
        data-wm-id="buy.studio-edition"
      >
        {loading ? "Redirection…" : label}
        <ArrowUpRight className="w-4 h-4" />
      </button>
      {err && (
        <span className="text-xs text-rose-700 mt-1">
          {err.includes("STRIPE")
            ? "Paiement bientôt disponible — Stripe pas encore configuré."
            : `Erreur : ${err}`}
        </span>
      )}
    </div>
  );
}
