/**
 * Plans Studio + résolution en prix Stripe (B.1).
 *
 * Trois offres : abonnement mensuel / annuel (mode subscription) et
 * Lifetime (mode payment, perpétuel). Le prix de chaque plan vit en env
 * Vercel — jamais hardcodé.
 *
 *   STRIPE_PRICE_STUDIO_MONTHLY    price_... (recurring/month)
 *   STRIPE_PRICE_STUDIO_ANNUAL     price_... (recurring/year)
 *   STRIPE_PRICE_STUDIO_LIFETIME   price_... (one-time)  — fallback sur
 *                                  l'ancien STRIPE_PRICE_ID (rétro-compat)
 */
export type StudioPlan = "monthly" | "annual" | "lifetime";

export interface ResolvedPlan {
  plan: StudioPlan;
  priceId: string;
  mode: "subscription" | "payment";
  edition: "studio";
}

/** Grâce ajoutée à `current_period_end` avant que la licence n'expire,
 *  pour absorber les délais de renouvellement / l'usage hors-ligne. */
export const SUBSCRIPTION_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function isStudioPlan(v: unknown): v is StudioPlan {
  return v === "monthly" || v === "annual" || v === "lifetime";
}

/** Résout un plan en priceId + mode Stripe. `null` si non configuré. */
export function resolvePlan(plan: StudioPlan): ResolvedPlan | null {
  const env = process.env;
  let priceId: string | undefined;
  let mode: "subscription" | "payment";
  switch (plan) {
    case "monthly":
      priceId = env.STRIPE_PRICE_STUDIO_MONTHLY;
      mode = "subscription";
      break;
    case "annual":
      priceId = env.STRIPE_PRICE_STUDIO_ANNUAL;
      mode = "subscription";
      break;
    case "lifetime":
      // Rétro-compat : l'ancien one-time STRIPE_PRICE_ID = Lifetime.
      priceId = env.STRIPE_PRICE_STUDIO_LIFETIME ?? env.STRIPE_PRICE_ID;
      mode = "payment";
      break;
  }
  if (!priceId) return null;
  return { plan, priceId, mode, edition: "studio" };
}
