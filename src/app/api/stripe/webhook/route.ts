import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Webhook Stripe — reçoit `checkout.session.completed` et notifie Ben
 * via Discord pour fulfillment manuel de la license.
 * Sprint 10 MVP-1 — fulfillment manuel. Sprint 11+ aura l'auto-issue
 * + email direct au client via Resend.
 *
 * Stripe Dashboard config :
 *   URL    : https://webgen-motion.vercel.app/api/stripe/webhook
 *   Events : checkout.session.completed (+ optionnel payment_intent.succeeded)
 *
 * Signature verification via Stripe webhook secret — sans ça n'importe
 * qui pourrait POST des fake events. Donc on lit le body en raw text
 * (Next App Router : `await req.text()`), passe à constructEvent avec
 * la signature header + secret.
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

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await notifyDiscord({
        customerEmail:
          session.customer_details?.email ??
          session.customer_email ??
          "(email manquant)",
        customerName: session.customer_details?.name ?? null,
        amountTotal: session.amount_total ?? 0,
        currency: (session.currency ?? "usd").toUpperCase(),
        sessionId: session.id,
        livemode: event.livemode,
      });
    }
  } catch (e) {
    // Ne pas faire échouer le webhook si la notif Discord échoue —
    // Stripe re-tente sinon, et on perdrait l'event en boucle. Mieux
    // vaut log + 200 pour signaler à Stripe qu'on a bien reçu.
    console.error("[stripe/webhook] post-process error:", e);
  }

  return NextResponse.json({ received: true });
}

async function notifyDiscord(p: {
  customerEmail: string;
  customerName: string | null;
  amountTotal: number;
  currency: string;
  sessionId: string;
  livemode: boolean;
}) {
  const webhook = process.env.WEBGEN_MOTION_DISCORD_WEBHOOK;
  if (!webhook) {
    console.warn("[stripe/webhook] WEBGEN_MOTION_DISCORD_WEBHOOK absent, skip notif");
    return;
  }
  const amount = (p.amountTotal / 100).toFixed(2);
  const env = p.livemode ? "🟢 LIVE" : "🟡 TEST";
  const content =
    `${env} · 💰 **Nouveau paiement Studio Edition**\n` +
    `\n` +
    `Email   : \`${p.customerEmail}\`\n` +
    (p.customerName ? `Nom     : \`${p.customerName}\`\n` : "") +
    `Montant : **${amount} ${p.currency}**\n` +
    `Session : \`${p.sessionId}\`\n` +
    `\n` +
    `**Action à faire** :\n` +
    `\`\`\`bash\n` +
    `cd ~/IdeaProjects/webgen-motion && \\\n` +
    `node scripts/issue-license.mjs \\\n` +
    `  --email ${p.customerEmail} \\\n` +
    `  --edition studio \\\n` +
    `  --expires perpetual \\\n` +
    `  --note "Stripe ${p.sessionId}"\n` +
    `\`\`\`\n` +
    `Puis envoyer le \`.license\` généré par email au client.`;
  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
}
