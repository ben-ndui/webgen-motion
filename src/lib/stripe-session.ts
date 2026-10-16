import type Stripe from "stripe";

import type { ResolvedPlan, StudioPlan } from "./stripe-plans";

/**
 * Les paramètres de la Checkout Session Studio. Module pur : la route les
 * passe tels quels à `stripe.checkout.sessions.create`.
 *
 * Deux familles, à garder ensemble :
 * - les NÔTRES, dont tout dépend : l'offre en métadonnées (la licence et les
 *   renouvellements la lisent), la preuve d'achat professionnel (CGV), la
 *   création du client (sans elle, pas d'email, pas de licence) ;
 * - les réglages du Checkout Studio de Stripe (16/10/2026), avec deux écarts
 *   voulus par Ben : `origin_context: "web"` (le Studio proposait « mobile_app »,
 *   or on paie depuis genmotion.app) et PAS de collecte du téléphone (aucun
 *   usage, donnée personnelle de trop).
 */
type Parametres = {
  resolved: ResolvedPlan;
  plan: StudioPlan;
  base: string;
  consentement: Record<string, string>;
};

export function parametresDeLaSession({ resolved, plan, base, consentement }: Parametres): Stripe.Checkout.SessionCreateParams {
  const abonnement = resolved.mode === "subscription";
  return {
    mode: resolved.mode,
    payment_method_types: ["card"],
    line_items: [{ price: resolved.priceId, quantity: 1 }],
    success_url: `${base}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/download`,

    // Réglages du Checkout Studio.
    ui_mode: "hosted_page",
    integration_identifier: "hosted_mobile_app_0001",
    origin_context: "web",
    billing_address_collection: "auto",
    automatic_tax: { enabled: false }, // franchise de TVA (art. 293 B du CGI)
    allow_promotion_codes: true,
    submit_type: "auto",
    // La carte s'enregistre à la demande pour un achat unique ; un abonnement la garde de toute façon.
    ...(abonnement ? { payment_method_collection: "always" as const } : { saved_payment_method_options: { payment_method_save: "enabled" as const } }),

    // Les nôtres. `customer_creation` n'existe qu'en mode payment (un abonnement crée toujours le client).
    ...(abonnement ? {} : { customer_creation: "always" as const }),
    metadata: { product: "studio-edition", plan, source: "webgen-motion-landing", ...consentement },
    // L'offre voyage avec l'abonnement : les renouvellements la retrouvent.
    ...(abonnement ? { subscription_data: { metadata: { plan, edition: "studio", ...consentement } } } : {}),
  };
}
