import Stripe from "stripe";

/**
 * Client Stripe partagé pour les routes API webgen-motion.
 * Sprint 10 — Studio Edition checkout MVP.
 *
 * Env vars requis (Vercel Settings → Environment Variables) :
 *   STRIPE_SECRET_KEY                sk_test_... ou sk_live_...
 *   STRIPE_WEBHOOK_SECRET            whsec_... (Stripe Dashboard → Webhooks)
 *   STRIPE_PRICE_ID                  price_... du product "GEN MOTION Studio"
 *   WEBGEN_MOTION_DISCORD_WEBHOOK    https://discord.com/api/webhooks/...
 *   NEXT_PUBLIC_APP_URL              https://genmotion.app
 */

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY env var manquant — set côté Vercel pour activer le checkout",
    );
  }
  cached = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return cached;
}

/** Base URL utilisée pour les success/cancel redirects. */
export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://genmotion.app";
}
