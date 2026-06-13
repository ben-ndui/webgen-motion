import BuyButton from "./buy-button";

/**
 * Offre Studio 3 paliers (B.8) — Lifetime héros + abonnement en option.
 *
 * ⚠️ Les MONTANTS ci-dessous sont la copy marketing : ils DOIVENT
 * correspondre aux prix réels créés dans Stripe (cf. env STRIPE_PRICE_STUDIO_*).
 * Le checkout affiche de toute façon le vrai prix Stripe — mais aligne ces
 * libellés pour rester cohérent.
 */
const PRICES = {
  lifetime: "199 €",
  annual: "120 €",
  monthly: "15 €",
} as const;

export default function StudioOffer() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-3"
      data-wm-id="download.studio.plans"
    >
      {/* Lifetime — le héros : on le possède. */}
      <div className="flex flex-col rounded-2xl border-2 border-ink bg-surface p-5">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink">
          À vie · recommandé
        </span>
        <div className="mt-2 text-3xl font-semibold text-ink">
          {PRICES.lifetime}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Paiement unique · mises à jour à vie · tu le possèdes.
        </p>
        <div className="mt-4">
          <BuyButton
            plan="lifetime"
            label={`Acheter à vie · ${PRICES.lifetime}`}
          />
        </div>
      </div>

      {/* Annuel */}
      <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          Annuel
        </span>
        <div className="mt-2 text-3xl font-semibold text-ink">
          {PRICES.annual}
          <span className="text-sm font-normal text-muted"> /an</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          2 mois offerts vs mensuel.
        </p>
        <div className="mt-4">
          <BuyButton
            plan="annual"
            variant="secondary"
            label={`S'abonner · ${PRICES.annual}/an`}
          />
        </div>
      </div>

      {/* Mensuel */}
      <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          Mensuel
        </span>
        <div className="mt-2 text-3xl font-semibold text-ink">
          {PRICES.monthly}
          <span className="text-sm font-normal text-muted"> /mois</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Sans engagement, résiliable.
        </p>
        <div className="mt-4">
          <BuyButton
            plan="monthly"
            variant="secondary"
            label={`S'abonner · ${PRICES.monthly}/mois`}
          />
        </div>
      </div>
    </div>
  );
}
