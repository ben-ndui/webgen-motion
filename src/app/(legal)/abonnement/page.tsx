import type { Metadata } from "next";

import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Gérer mon abonnement",
  description: "Résilier ou gérer un abonnement GEN MOTION Studio (mensuel ou annuel).",
};

// Lu à chaque visite : le lien du portail Stripe se pose sans redéployer.
export const dynamic = "force-dynamic";

/**
 * Résilier un abonnement Studio en quelques clics. Le portail client
 * Stripe (lien de connexion : la personne entre l'email de l'achat et
 * reçoit un code) fait la résiliation ; tant que le lien n'est pas posé
 * (`STRIPE_PORTAL_LOGIN_URL`), la marche à suivre passe par l'email.
 */
export default function GererMonAbonnement() {
  const portail = process.env.STRIPE_PORTAL_LOGIN_URL?.trim();
  const contact = LEGAL.publisher.contactEmail;
  return (
    <>
      <h1>Gérer mon abonnement</h1>
      <p>
        Ton abonnement Studio (mensuel ou annuel) se résilie <strong>à tout moment</strong>, sans frais ni justification.
        Il s&apos;arrête à la fin de la période déjà payée : ta licence Studio reste active jusqu&apos;à cette date, puis
        GEN MOTION repasse en Community. Rien n&apos;est remboursé au prorata.
      </p>

      {portail ? (
        <>
          <h2>Résilier ou modifier</h2>
          <p>
            Entre l&apos;email utilisé à l&apos;achat, Stripe t&apos;envoie un code, puis choisis « Annuler
            l&apos;abonnement ». Tu y changes aussi ta carte et retrouves tes factures.
          </p>
          <p>
            <a href={portail} className="legal-bouton" target="_blank" rel="noreferrer" data-wm-id="abonnement.portail">
              Ouvrir mon espace d&apos;abonnement
            </a>
          </p>
        </>
      ) : (
        <>
          <h2>Résilier</h2>
          <p>
            Écris à <a href={`mailto:${contact}?subject=R%C3%A9siliation%20GEN%20MOTION%20Studio`}>{contact}</a>{" "}depuis
            l&apos;email utilisé à l&apos;achat, avec « Résiliation » en objet. La résiliation prend effet à la date de ton
            message et t&apos;est confirmée par email.
          </p>
        </>
      )}

      <h2>Licence à vie</h2>
      <p>Achetée en une fois, elle ne se renouvelle pas : il n&apos;y a rien à résilier.</p>
    </>
  );
}
