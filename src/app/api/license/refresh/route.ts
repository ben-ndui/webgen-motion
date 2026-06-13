import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { verifyLicenseSignature } from "@/lib/license/verify";
import { issueLicense } from "@/lib/license/issue";
import { resolveSigningKey } from "@/lib/license/fulfillment";
import { SUBSCRIPTION_GRACE_MS } from "@/lib/stripe-plans";

export const runtime = "nodejs";

/**
 * Refresh d'abonnement (B.5) — auto-renouvellement de la licence sans
 * intervention humaine, **Stripe = source de vérité** (aucune DB).
 *
 * Flux : l'app POST sa licence courante → on vérifie la signature (même
 * expirée, cf. verifyLicenseSignature) → on lit l'email → on cherche un
 * abonnement Stripe ACTIF pour cet email → si actif, on ré-émet une
 * licence time-boxée au nouveau `current_period_end` (+ grâce).
 *
 *  - Lifetime (expiresAt null) → rien à faire, on renvoie la licence.
 *  - Pas d'abo actif → 403 (l'app laissera expirer → Community).
 *
 * La licence signée fait office de bearer token (vérif Ed25519). Anti-abus :
 * rate-limit mémoire par email.
 */
const lastRefresh = new Map<string, number>();
const REFRESH_MIN_INTERVAL_MS = 60 * 60 * 1000; // 1h

export async function POST(req: NextRequest) {
  let body: { license?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const content = typeof body.license === "string" ? body.license : null;
  if (!content) {
    return NextResponse.json({ error: "license required" }, { status: 400 });
  }

  const v = verifyLicenseSignature(content);
  if (!v.valid) {
    return NextResponse.json(
      { error: "invalid license", reason: v.error },
      { status: 400 },
    );
  }
  const { email, edition, expiresAt } = v.payload;

  // Lifetime / perpétuel → rien à renouveler.
  if (expiresAt === null) {
    return NextResponse.json({ status: "lifetime", license: content });
  }
  if (edition === "community") {
    return NextResponse.json({ error: "not licensed" }, { status: 400 });
  }

  // Rate-limit : 1 refresh utile / heure / email (renvoie la licence telle
  // quelle entre-temps).
  const now = Date.now();
  if (now - (lastRefresh.get(email) ?? 0) < REFRESH_MIN_INTERVAL_MS) {
    return NextResponse.json({ status: "throttled", license: content });
  }

  const key = resolveSigningKey(process.env);
  if (!key) {
    console.error("[license/refresh] clé de signature absente");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  // Abonnement actif le plus lointain pour cet email.
  let periodEnd: number | null = null;
  let plan: string | undefined;
  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email, limit: 10 });
    for (const cust of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: cust.id,
        status: "active",
        limit: 10,
      });
      for (const sub of subs.data) {
        const s = sub as unknown as {
          current_period_end?: number;
          items?: { data?: Array<{ current_period_end?: number }> };
          metadata?: Record<string, string>;
        };
        const pe =
          s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
        if (pe && (periodEnd === null || pe > periodEnd)) {
          periodEnd = pe;
          if (typeof s.metadata?.plan === "string") plan = s.metadata.plan;
        }
      }
    }
  } catch (e) {
    console.error("[license/refresh] Stripe lookup échoué:", e);
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }

  if (periodEnd === null) {
    // Aucun abo actif → on ne renouvelle pas (annulé / impayé / remboursé).
    return NextResponse.json({ status: "inactive" }, { status: 403 });
  }

  lastRefresh.set(email, now);
  const newExpiresAt = periodEnd * 1000 + SUBSCRIPTION_GRACE_MS;
  try {
    const { content: fresh } = issueLicense(
      {
        email,
        edition, // narrowed à studio | enterprise (community rejeté plus haut)
        expiresAt: newExpiresAt,
        note: plan ? `refresh · plan ${plan}` : "refresh",
      },
      key,
    );
    return NextResponse.json({
      status: "renewed",
      license: fresh,
      expiresAt: newExpiresAt,
    });
  } catch (e) {
    console.error("[license/refresh] émission échouée:", e);
    return NextResponse.json({ error: "issue failed" }, { status: 500 });
  }
}
