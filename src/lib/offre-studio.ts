/**
 * Les prix de la Studio Edition, en un seul endroit : la page d'achat, le
 * formulaire de licence et les CGV les lisent ici. Deux copies avaient
 * divergé (CGV à « 49 USD », 15/10/2026).
 *
 * ⚠️ Ils DOIVENT correspondre aux prix créés dans Stripe
 * (STRIPE_PRICE_STUDIO_MONTHLY / ANNUAL / LIFETIME) : le paiement débite le
 * prix Stripe, ces montants ne servent qu'à l'affichage et aux CGV.
 */
export const PRIX_STUDIO = { mensuel: 15, annuel: 120, aVie: 199 } as const;

export function euros(montant: number): string {
  return `${montant} €`;
}

/** Ce que l'annuel fait gagner sur douze mois au tarif mensuel, en mois. */
export function moisOffertsParLAnnuel(): number {
  return Math.round((PRIX_STUDIO.mensuel * 12 - PRIX_STUDIO.annuel) / PRIX_STUDIO.mensuel);
}
