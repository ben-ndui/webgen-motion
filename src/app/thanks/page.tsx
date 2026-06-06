import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { getStripe } from "@/lib/stripe";

/**
 * Page /thanks — landing after Stripe Checkout success.
 * URL : /thanks?session_id=<id>
 *
 * Server component : fetch la session Stripe pour récupérer l'email
 * destinataire et l'afficher (UX : le client sait à quelle adresse
 * sa license va arriver).
 *
 * MVP-1 fulfillment manuel : on annonce "license sous 24h", Ben
 * voit le webhook Discord, gen + envoie la license à la main.
 */
export const dynamic = "force-dynamic";

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let email: string | null = null;
  let amount: string | null = null;
  if (session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      email = session.customer_details?.email ?? null;
      if (session.amount_total && session.currency) {
        amount = `${(session.amount_total / 100).toFixed(2)} ${session.currency.toUpperCase()}`;
      }
    } catch (e) {
      console.error("[thanks] retrieve session failed:", e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="font-semibold text-sm tracking-tight">
              GEN MOTION
              <span className="hidden sm:inline ml-2 text-faint font-normal">
                — Smooth &amp; Design
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-20 sm:pt-28 pb-20">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.25em] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 mb-8">
            <Check className="w-3 h-3" strokeWidth={3} />
            Paiement reçu
          </div>
          <h1 className="text-[44px] sm:text-[64px] font-medium leading-[0.95] tracking-[-0.04em] text-ink mb-8">
            Merci pour ton achat.
            <br />
            <span className="text-faint">
              On t&apos;envoie ta license.
            </span>
          </h1>

          <div className="space-y-6 text-ink-soft">
            {email && (
              <p>
                Une license <strong className="text-ink font-medium">Studio Edition</strong>{" "}
                te sera envoyée à{" "}
                <strong className="text-ink font-medium">{email}</strong>{" "}
                sous 24h (souvent en quelques minutes pendant les heures
                ouvrées européennes).
              </p>
            )}
            {!email && (
              <p>
                Une license <strong className="text-ink font-medium">Studio Edition</strong>{" "}
                te sera envoyée à l&apos;adresse email indiquée lors du
                paiement, sous 24h.
              </p>
            )}
            {amount && (
              <p className="text-sm text-muted font-mono">
                Montant : {amount}
              </p>
            )}
          </div>

          <div className="mt-12 pt-12 border-t border-line">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted mb-6">
              Prochaines étapes
            </p>
            <ol className="space-y-5 text-ink-soft">
              <Step
                n="01"
                title="Tu reçois l'email avec le fichier `.license`"
                detail="Souvent dans les 30 min, max 24h. Vérifie ton dossier spam si rien après 1h — ouvre un ticket si rien après 24h."
              />
              <Step
                n="02"
                title="Tu ouvres GEN MOTION et va dans Settings → License"
                detail="Si tu n'as pas encore l'app : télécharge-la d'abord depuis /download (notarisée Apple, aucun pop-up bloquant)."
              />
              <Step
                n="03"
                title="Tu colles le contenu du `.license` et clique Installer"
                detail="L'app vérifie la signature Ed25519 localement, débloque immédiatement les frames 3D, presets Cinematic & Glitch, multi-format export."
              />
            </ol>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors"
            >
              Télécharger l&apos;app
            </Link>
            <a
              href="mailto:contact@smoothandesign.fr"
              className="text-sm text-ink-soft underline underline-offset-4 decoration-line hover:decoration-ink transition-colors"
            >
              Une question ? Écris-nous
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, detail }: { n: string; title: string; detail: string }) {
  return (
    <li className="grid grid-cols-12 gap-4">
      <div className="col-span-2 sm:col-span-1 text-[11px] font-mono text-faint pt-1">
        {n}
      </div>
      <div className="col-span-10 sm:col-span-11">
        <h4 className="text-base font-medium text-ink mb-1">{title}</h4>
        <p className="text-sm text-muted leading-relaxed">{detail}</p>
      </div>
    </li>
  );
}
