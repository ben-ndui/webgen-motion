"use client";

import { useState } from "react";
import Link from "next/link";

import { PRIX_STUDIO, euros, moisOffertsParLAnnuel } from "@/lib/offre-studio";

import BuyButton from "./buy-button";
import CaseAchatProfessionnel from "./case-achat-professionnel";

/**
 * Offre Studio 3 paliers (B.8) : à vie en héros, abonnement en option. Les
 * montants viennent de `src/lib/offre-studio.ts` (la même source que les
 * CGV) ; le paiement débite, lui, le prix créé dans Stripe.
 */
export default function StudioOffer() {
  const [pro, setPro] = useState(false);
  return (
    <div className="flex flex-col gap-4" data-wm-id="download.studio.plans">
      <CaseAchatProfessionnel coche={pro} changer={setPro} />
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Lifetime — le héros : on le possède. */}
        <div className="flex flex-col rounded-2xl border-2 border-ink bg-surface p-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink">À vie · recommandé</span>
          <div className="mt-2 text-3xl font-semibold text-ink">{euros(PRIX_STUDIO.aVie)}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">Paiement unique · mises à jour à vie · tu le possèdes.</p>
          <div className="mt-4">
            <BuyButton plan="lifetime" achatProfessionnel={pro} label={`Acheter à vie · ${euros(PRIX_STUDIO.aVie)}`} />
          </div>
        </div>

        {/* Annuel */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Annuel</span>
          <div className="mt-2 text-3xl font-semibold text-ink">
            {euros(PRIX_STUDIO.annuel)}
            <span className="text-sm font-normal text-muted"> /an</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{moisOffertsParLAnnuel()} mois offerts par rapport au mensuel.</p>
          <div className="mt-4">
            <BuyButton plan="annual" achatProfessionnel={pro} variant="secondary" label={`S'abonner · ${euros(PRIX_STUDIO.annuel)}/an`} />
          </div>
        </div>

        {/* Mensuel */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Mensuel</span>
          <div className="mt-2 text-3xl font-semibold text-ink">
            {euros(PRIX_STUDIO.mensuel)}
            <span className="text-sm font-normal text-muted"> /mois</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Sans engagement :{" "}
            <Link href="/abonnement" className="underline underline-offset-2">
              tu résilies quand tu veux
            </Link>
            .
          </p>
          <div className="mt-4">
            <BuyButton plan="monthly" achatProfessionnel={pro} variant="secondary" label={`S'abonner · ${euros(PRIX_STUDIO.mensuel)}/mois`} />
          </div>
        </div>
      </div>
    </div>
  );
}
