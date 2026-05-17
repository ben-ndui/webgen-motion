import { NextResponse } from "next/server";
import { getStripe, getAppBaseUrl } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Crée une Stripe Checkout Session one-time pour GEN MOTION Studio
 * Edition. Public endpoint — n'importe qui peut acheter, pas d'auth
 * (l'achat lui-même est l'auth via paiement). La license sera
 * fulfilled à réception du webhook (cf. /api/stripe/webhook).
 *
 * Pattern : POST → retourne `{url}` → le client redirect window.location
 * vers cette URL Stripe-hosted. Cancel revient sur /download, success
 * sur /thanks?session_id=...
 */
export async function POST() {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_ID env var manquant" },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();
    const base = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // CHECKOUT_SESSION_ID est interpolé par Stripe avec l'id réel
      // au moment de la redirect — on l'utilise pour fetch les détails
      // côté /thanks pour afficher l'email destinataire.
      success_url: `${base}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/download`,
      // Required for one-time payments to capture customer email
      // (Stripe le demande à l'écran checkout si pas pré-rempli).
      customer_creation: "always",
      metadata: {
        product: "studio-edition",
        source: "webgen-motion-landing",
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/checkout]", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
