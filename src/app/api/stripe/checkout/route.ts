import { NextRequest, NextResponse } from "next/server";
import { getStripe, getAppBaseUrl } from "@/lib/stripe";
import { resolvePlan, isStudioPlan, type StudioPlan } from "@/lib/stripe-plans";
import { parametresDeLaSession } from "@/lib/stripe-session";
import { LEGAL } from "@/lib/legal/config";

export const runtime = "nodejs";

/**
 * Crée une Stripe Checkout Session pour GEN MOTION Studio (B.2).
 *
 * Body : `{ plan?: "monthly" | "annual" | "lifetime", achatProfessionnel: true }`
 * (plan par défaut "lifetime"). Public — l'achat est l'auth.
 *
 * La Studio Edition est vendue aux professionnels seulement (CGV, décision
 * du 16/10/2026) : sans la case cochée, pas de paiement. Le consentement et
 * la version des CGV voyagent dans les métadonnées Stripe (la preuve).
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
  let achatProfessionnel = false;
  try {
    const body = (await req.json()) as { plan?: unknown; achatProfessionnel?: unknown };
    if (isStudioPlan(body?.plan)) plan = body.plan;
    achatProfessionnel = body?.achatProfessionnel === true;
  } catch {
    // Pas de body / JSON invalide : défaut lifetime, et pas de consentement.
  }
  if (!achatProfessionnel) {
    return NextResponse.json(
      { error: "La Studio Edition est réservée aux professionnels : coche la case avant de payer." },
      { status: 400 },
    );
  }
  const consentement = { achat_professionnel: "oui", cgv_acceptees: LEGAL.lastUpdated };

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
    const session = await stripe.checkout.sessions.create(parametresDeLaSession({ resolved, plan, base, consentement }));
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/checkout]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
