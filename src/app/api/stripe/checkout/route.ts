import { NextRequest, NextResponse } from "next/server";
import { getStripe, getAppBaseUrl } from "@/lib/stripe";
import { resolvePlan, isStudioPlan, type StudioPlan } from "@/lib/stripe-plans";

export const runtime = "nodejs";

/**
 * Crée une Stripe Checkout Session pour GEN MOTION Studio (B.2).
 *
 * Body : `{ plan?: "monthly" | "annual" | "lifetime" }` (défaut "lifetime"
 * pour la rétro-compat du CTA existant). Public — l'achat est l'auth.
 *
 *  - monthly / annual → `mode: "subscription"` (Stripe crée le customer)
 *  - lifetime         → `mode: "payment"` (one-time, customer forcé pour
 *    récupérer l'email)
 *
 * La licence est émise au webhook `checkout.session.completed`. Pour les
 * abos, `subscription_data.metadata` porte le plan → exploité aux
 * renouvellements.
 */
export async function POST(req: NextRequest) {
  let plan: StudioPlan = "lifetime";
  try {
    const body = (await req.json()) as { plan?: unknown };
    if (isStudioPlan(body?.plan)) plan = body.plan;
  } catch {
    // Pas de body / JSON invalide → on garde le défaut lifetime.
  }

  const resolved = resolvePlan(plan);
  if (!resolved) {
    return NextResponse.json(
      { error: `Plan "${plan}" non configuré (price Stripe manquant)` },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();
    const base = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: resolved.mode,
      payment_method_types: ["card"],
      line_items: [{ price: resolved.priceId, quantity: 1 }],
      success_url: `${base}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/download`,
      // `customer_creation` n'est valide qu'en mode payment ; en mode
      // subscription Stripe crée toujours le customer.
      ...(resolved.mode === "payment"
        ? { customer_creation: "always" as const }
        : {}),
      metadata: {
        product: "studio-edition",
        plan,
        source: "webgen-motion-landing",
      },
      // Le plan voyage avec l'abo → disponible aux renouvellements.
      ...(resolved.mode === "subscription"
        ? { subscription_data: { metadata: { plan, edition: "studio" } } }
        : {}),
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/checkout]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
