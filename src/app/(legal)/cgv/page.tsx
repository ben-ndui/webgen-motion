import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL } from "@/lib/legal/config";
import { PRIX_STUDIO, euros } from "@/lib/offre-studio";

import ArticlesDeLaSuite from "./articles-de-la-suite";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description: "CGV de la Studio Edition GEN MOTION, réservée aux professionnels : licence à vie, abonnement mensuel ou annuel.",
};

/**
 * CGV de la Studio Edition, vendue aux PROFESSIONNELS seulement (décision du
 * 16/10/2026) : la case « achat professionnel » précède tout paiement et le
 * serveur refuse une commande sans elle. Identité, prix et juridiction
 * viennent de `src/lib/legal/config.ts` et `src/lib/offre-studio.ts`.
 */
export default function CGV() {
  const p = LEGAL.publisher;
  const a = p.address;
  return (
    <>
      <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-faint mb-3">Document légal · mis à jour le {LEGAL.lastUpdated}</p>
      <h1>Conditions Générales de Vente</h1>

      <p>
        Vendeur : <strong>{p.legalName}</strong>, {p.legalForm.toLowerCase()}, nom commercial <strong>{p.tradeName}</strong>,
        SIREN {p.siren}, {p.registre.charAt(0).toLowerCase()}{p.registre.slice(1)}, {a.street}, {a.postalCode} {a.city}.
        Contact : <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>.
      </p>

      <h2>Article 1. Objet et clients</h2>
      <p>
        Les présentes conditions régissent la vente de la <strong>Studio Edition</strong> de GEN MOTION. Elle est vendue
        <strong> exclusivement aux professionnels</strong>{" "}(entreprises, indépendants, micro-entrepreneurs) qui
        l&apos;achètent pour leur activité. Le client le déclare en cochant la case prévue avant le paiement ; sans elle,
        aucune commande n&apos;est possible. Les règles du Code de la consommation propres aux consommateurs ne
        s&apos;appliquent donc pas.
      </p>
      <p>
        La <strong>Community Edition</strong> reste gratuite. Elle est régie par les <Link href="/cgu">CGU</Link> et par
        la licence du logiciel ({LEGAL.product.license}).
      </p>

      <h2>Article 2. Offres et prix</h2>
      <ul>
        <li><strong>Licence à vie</strong> : {euros(PRIX_STUDIO.aVie)}, payés une fois.</li>
        <li><strong>Abonnement annuel</strong> : {euros(PRIX_STUDIO.annuel)} par an.</li>
        <li><strong>Abonnement mensuel</strong> : {euros(PRIX_STUDIO.mensuel)} par mois.</li>
      </ul>
      <p>Les trois offres donnent accès aux mêmes fonctionnalités : {LEGAL.product.editions.studio.scope}.</p>
      <p>
        Les prix sont en euros et nets : {p.vatStatus}. Le montant débité est celui affiché sur la page de paiement au
        moment de la commande.
      </p>

      <h2>Article 3. Commande et paiement</h2>
      <p>
        La commande se passe sur <strong>{LEGAL.site.domain}</strong>. Le paiement par carte est traité par{" "}
        <strong>Stripe Payments Europe Ltd.</strong> (Dublin, Irlande) ; {p.tradeName} ne voit ni ne conserve aucune
        donnée de carte. Une facture est fournie sur simple demande à{" "}
        <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>.
      </p>

      <h2>Article 4. Licence et livraison</h2>
      <p>
        Une fois le paiement confirmé, la licence est envoyée par email à l&apos;adresse de la commande, en général dans
        les minutes qui suivent. C&apos;est un fichier <code>.license</code> signé, à installer dans l&apos;application
        (Réglages, Licence). Sans nouvelles après 24 heures, vérifie tes indésirables puis écris-nous en indiquant
        l&apos;email utilisé pour payer.
      </p>
      <p>
        La licence est <strong>nominative</strong> : elle est liée à l&apos;email de la commande et sert l&apos;activité
        du client. Elle ne se revend pas et ne se partage pas avec un tiers.
      </p>

      <h2>Article 5. Abonnements</h2>
      <p>
        L&apos;abonnement mensuel dure un mois, l&apos;annuel un an, à partir du paiement. Il se{" "}
        <strong>renouvelle automatiquement</strong> pour la même durée, et la carte enregistrée est débitée à chaque
        échéance. Un changement de prix ne s&apos;applique qu&apos;au renouvellement suivant, annoncé par email au moins
        30 jours avant.
      </p>
      <p>
        Le client <strong>résilie à tout moment</strong>, sans frais ni justification, depuis la page{" "}
        <Link href="/abonnement">Gérer mon abonnement</Link>. La résiliation prend effet à la fin de la période déjà
        payée : la licence Studio reste active jusqu&apos;à cette date, puis l&apos;application repasse en Community.
        Aucune période entamée n&apos;est remboursée au prorata.
      </p>
      <p>
        Si un paiement de renouvellement échoue, Stripe le retente. À défaut de paiement, l&apos;abonnement prend fin et
        la licence expire à la fin de la dernière période payée.
      </p>

      <ArticlesDeLaSuite />
    </>
  );
}
