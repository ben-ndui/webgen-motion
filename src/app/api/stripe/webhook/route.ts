import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckout, type FulfillmentResult } from "@/lib/license/fulfillment";

export const runtime = "nodejs";

/**
 * Idempotence — Stripe re-livre un event tant qu'il n'a pas reçu un 2xx
 * (et peut le livrer plusieurs fois). On dédoublonne par `event.id`.
 *
 * ⚠ Store EN MÉMOIRE — limites assumées :
 *   - protège un même process. En multi-instance serverless (Vercel),
 *     deux instances pourraient traiter le même event en parallèle.
 *   - le projet n'embarque aujourd'hui aucun store durable (pas de KV /
 *     Redis en dépendance). On NE sur-ingénie PAS : on garde la dédup
 *     mémoire ET on rend le chemin retry-safe (on ne marque l'event
 *     « traité » QUE si le critique a réussi ou est non-retryable), de
 *     sorte qu'un échec transitoire laisse Stripe re-livrer.
 *   - TODO(P2/scale) : passer à un store durable (Vercel KV / Upstash)
 *     keyé par event.id avec TTL, dès que le volume justifie la garantie
 *     exactly-once cross-instance.
 */
const processedEventIds = new Set<string>();

/** Réinitialise le store d'idempotence (tests uniquement). */
export function __resetWebhookIdempotency(): void {
  processedEventIds.clear();
}

/**
 * Webhook Stripe — sur `checkout.session.completed`, fulfillment
 * AUTOMATIQUE : émission de la licence signée + envoi par email au
 * client (Resend). Plus aucune étape humaine sur le chemin critique.
 * Le notif Discord est conservé en best-effort (visibilité backoffice).
 *
 * Stripe Dashboard config :
 *   URL    : https://genmotion.app/api/stripe/webhook
 *   Events : checkout.session.completed
 *
 * Env requis pour l'auto-fulfillment :
 *   STRIPE_WEBHOOK_SECRET                vérif signature
 *   LICENSE_SIGNING_PRIVATE_KEY[_B64]    private key Ed25519 (PEM ou base64)
 *   RESEND_API_KEY (+ RESEND_FROM)       envoi email
 *   WEBGEN_MOTION_DISCORD_WEBHOOK        notif best-effort (optionnel)
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }
  if (!webhookSecret) {
    return new NextResponse("STRIPE_WEBHOOK_SECRET missing", { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error("[stripe/webhook] signature verify failed:", (e as Error).message);
    return new NextResponse(`Webhook signature error`, { status: 400 });
  }

  // Déjà traité avec succès → 200 sans rejouer l'effet de bord.
  if (processedEventIds.has(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // On ne gère que l'achat. Les autres events sont acquittés (200) sans
  // action — et marqués traités pour ne pas reboucler.
  if (event.type !== "checkout.session.completed") {
    processedEventIds.add(event.id);
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email =
    session.customer_details?.email ?? session.customer_email ?? null;

  if (!email) {
    // Sans email, impossible d'émettre/livrer. Non retryable.
    console.error("[stripe/webhook] email client absent sur la session", session.id);
    processedEventIds.add(event.id);
    return NextResponse.json({ received: true, fulfilled: false, reason: "no-email" });
  }

  let result: FulfillmentResult;
  try {
    result = await fulfillCheckout(
      { email, edition: "studio", reference: session.id },
      process.env,
    );
  } catch (e) {
    // fulfillCheckout ne devrait pas throw, mais ceinture+bretelles :
    // on NE marque PAS traité → Stripe retentera.
    console.error("[stripe/webhook] fulfillment inattendu :", e);
    return new NextResponse("Fulfillment error", { status: 500 });
  }

  // Échec transitoire (Resend down…) → 500 sans marquer, Stripe retente.
  if (result.retryable) {
    return new NextResponse("Fulfillment retryable error", { status: 500 });
  }

  // Critique fait (ou impossible de façon non-transitoire) → on acquitte.
  processedEventIds.add(event.id);

  // Discord best-effort : ne doit jamais faire échouer le webhook.
  try {
    await notifyDiscord({
      customerEmail: email,
      customerName: session.customer_details?.name ?? null,
      amountTotal: session.amount_total ?? 0,
      currency: (session.currency ?? "usd").toUpperCase(),
      sessionId: session.id,
      livemode: event.livemode,
      result,
    });
  } catch (e) {
    console.error("[stripe/webhook] notif Discord échouée (ignoré):", e);
  }

  return NextResponse.json({
    received: true,
    fulfilled: result.licensed,
    emailed: result.emailed,
    reason: result.reason,
  });
}

async function notifyDiscord(p: {
  customerEmail: string;
  customerName: string | null;
  amountTotal: number;
  currency: string;
  sessionId: string;
  livemode: boolean;
  result: FulfillmentResult;
}) {
  const webhook = process.env.WEBGEN_MOTION_DISCORD_WEBHOOK;
  if (!webhook) {
    console.warn("[stripe/webhook] WEBGEN_MOTION_DISCORD_WEBHOOK absent, skip notif");
    return;
  }
  const amount = (p.amountTotal / 100).toFixed(2);
  const env = p.livemode ? "🟢 LIVE" : "🟡 TEST";
  const status =
    p.result.licensed && p.result.emailed
      ? "✅ Licence émise + email envoyé (auto)"
      : p.result.licensed
        ? "⚠️ Licence émise, email NON envoyé — livraison manuelle requise"
        : "❌ Émission échouée — fulfillment manuel requis";
  const content =
    `${env} · 💰 **Paiement Studio Edition**\n` +
    `\n` +
    `Email   : \`${p.customerEmail}\`\n` +
    (p.customerName ? `Nom     : \`${p.customerName}\`\n` : "") +
    `Montant : **${amount} ${p.currency}**\n` +
    `Session : \`${p.sessionId}\`\n` +
    `Statut  : ${status}`;
  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
}
