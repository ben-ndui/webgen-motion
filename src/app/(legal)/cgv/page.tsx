import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente — GEN MOTION",
  description: "CGV de la Studio Edition GEN MOTION (paiement unique perpétuel).",
};

export default function CGV() {
  const p = LEGAL.publisher;
  return (
    <>
      <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-faint mb-3">
        Document légal · maj {LEGAL.lastUpdated}
      </p>
      <h1>Conditions Générales de Vente</h1>

      <p>
        Les présentes CGV régissent les ventes du produit{" "}
        <strong>GEN MOTION Studio Edition</strong> par{" "}
        <strong>{p.tradeName}</strong> (SIREN {p.siren}). Toute commande vaut
        acceptation pleine et entière des présentes CGV.
      </p>

      <h2>Article 1 — Produits et tarif</h2>
      <p>
        La <strong>Studio Edition</strong> de GEN MOTION est un produit
        numérique sous licence d&apos;usage <strong>perpétuelle</strong>{" "}
        (paiement unique, valable à vie). Tarif :{" "}
        <strong>{LEGAL.product.editions.studio.price}</strong>.
      </p>
      <p>
        La license débloque les fonctionnalités suivantes :{" "}
        {LEGAL.product.editions.studio.scope}.
      </p>
      <p>
        Le tarif est exprimé en dollars US (USD), toutes taxes incluses pour
        les clients européens (TVA collectée par Stripe en mode marketplace
        si applicable). En tant qu&apos;auto-entrepreneur soumis à la
        franchise en base de TVA (art. 293B CGI), {p.tradeName} ne facture
        pas la TVA française — voir mention sur la facture Stripe.
      </p>

      <h2>Article 2 — Commande et paiement</h2>
      <p>
        La commande s&apos;effectue depuis le site <strong>genmotion.app</strong>{" "}
        via Stripe Checkout (carte bancaire). Le paiement est sécurisé et
        traité par <strong>Stripe Payments Europe Ltd.</strong> (Dublin,
        Irlande). Aucune donnée bancaire n&apos;est conservée par {p.tradeName}.
      </p>

      <h2>Article 3 — Livraison de la license</h2>
      <p>
        À réception du paiement, vous recevrez votre license{" "}
        <strong>par email sous 24 heures ouvrées</strong>. La license consiste
        en un fichier <code>.license</code> signé cryptographiquement, à
        installer dans l&apos;app desktop GEN MOTION via le menu{" "}
        <strong>Settings → License</strong>.
      </p>
      <p>
        En cas de non-réception après 48 heures, vérifiez votre dossier spam
        puis contactez-nous à{" "}
        <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a> en précisant
        l&apos;email utilisé au moment du paiement.
      </p>

      <h2>Article 4 — Droit de rétractation</h2>
      <p>
        <strong>Renonciation au droit de rétractation</strong> — conformément
        à l&apos;article L221-28 13° du Code de la consommation, le droit de
        rétractation ne peut être exercé pour la fourniture de contenu
        numérique non fourni sur un support matériel dont l&apos;exécution a
        commencé après accord préalable exprès du consommateur et renoncement
        exprès à son droit de rétractation.
      </p>
      <p>
        En procédant au paiement, vous reconnaissez avoir été informé que la
        license Studio Edition est délivrée immédiatement après confirmation
        du paiement et renoncez expressément à votre droit de rétractation.
      </p>

      <h2>Article 5 — Remboursement</h2>
      <p>
        Bien que le droit de rétractation ne s&apos;applique pas, {p.tradeName}
        {" "}peut accepter un remboursement <strong>au cas par cas</strong> dans
        les 14 jours suivant l&apos;achat si vous démontrez que le produit ne
        fonctionne pas comme décrit. Contactez-nous à{" "}
        <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a> avec les
        détails de votre commande et la raison de votre demande.
      </p>

      <h2>Article 6 — License et restrictions d&apos;usage</h2>
      <p>
        L&apos;achat de la Studio Edition confère un droit d&apos;usage
        personnel <strong>perpétuel</strong> sur les fonctionnalités Studio.
        Ce droit est <strong>nominatif</strong> et lié à l&apos;email
        d&apos;achat. La revente, le partage ou la rediffusion de la license
        à des tiers sont interdits.
      </p>

      <h2>Article 7 — Mises à jour</h2>
      <p>
        La license Studio Edition donne accès à toutes les mises à jour
        futures du produit. Les évolutions majeures de format de license
        (passage en v2 par exemple) garantiront la rétro-compatibilité avec
        les licenses v1 émises sous les présentes CGV.
      </p>

      <h2>Article 8 — Support</h2>
      <p>
        Le support est assuré par email à{" "}
        <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a> avec un
        délai de réponse cible de 48 heures ouvrées. Pour les questions
        techniques générales (non-license), privilégiez l&apos;ouverture
        d&apos;une issue sur{" "}
        <a href={`${LEGAL.product.repo}/issues`} target="_blank" rel="noreferrer">
          GitHub
        </a>.
      </p>

      <h2>Article 9 — Droit applicable et juridiction</h2>
      <p>
        Les présentes CGV sont régies par le {LEGAL.jurisdiction.law}. Tout
        litige relèvera de la compétence exclusive des{" "}
        {LEGAL.jurisdiction.court}.
      </p>
    </>
  );
}
