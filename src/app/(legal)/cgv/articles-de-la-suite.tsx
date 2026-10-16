import Link from "next/link";

import { LEGAL } from "@/lib/legal/config";

/** Articles 6 à 13 des CGV : licence à vie, rétractation, services tiers, responsabilité, litiges. */
export default function ArticlesDeLaSuite() {
  const p = LEGAL.publisher;
  return (
    <>
      <h2>Article 6. Licence à vie</h2>
      <p>
        Payée une fois, elle n&apos;a pas de date de fin et ne se renouvelle pas. Elle donne accès aux mises à jour de
        GEN MOTION, y compris aux fonctionnalités Studio ajoutées par la suite, tant que le logiciel est développé.
      </p>

      <h2>Article 7. Rétractation et remboursement</h2>
      <p>
        Le droit de rétractation est réservé aux consommateurs ; il ne s&apos;applique pas à cette vente entre
        professionnels. Si la Studio Edition ne fonctionne pas comme décrit, {p.tradeName} étudie toute demande de
        remboursement reçue dans les 14 jours suivant l&apos;achat, avec le détail du problème, à{" "}
        <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>.
      </p>

      <h2>Article 8. Services tiers et coûts d&apos;usage</h2>
      <p>
        Certaines fonctionnalités s&apos;appuient sur des services que le client relie avec <strong>ses propres
        clés</strong> : Claude (Anthropic) pour l&apos;écriture, Google (Gemini, Veo) pour les vidéos et les portraits
        générés, ElevenLabs ou Google pour la voix off. Ces services sont facturés <strong>directement au client</strong>{" "}
        par leurs fournisseurs, à leurs tarifs, sans marge pour {p.tradeName}. Le client accepte leurs conditions ;{" "}
        {p.tradeName} ne répond ni de leur disponibilité, ni de leurs prix, ni de ce qu&apos;ils produisent.
      </p>
      <p>
        Le client garantit détenir les droits sur ce qu&apos;il utilise (sites filmés, marques, musiques, voix,
        visages). Il reste responsable de l&apos;usage des vidéos produites, notamment de l&apos;étiquette « contenu
        généré par IA » exigée par certaines plateformes.
      </p>

      <h2>Article 9. Garantie et responsabilité</h2>
      <p>
        GEN MOTION est fourni en l&apos;état ; {p.tradeName} s&apos;engage à faire de son mieux pour qu&apos;il
        fonctionne comme décrit (obligation de moyens). Le logiciel travaille sur l&apos;ordinateur du client : les
        sauvegardes de ses fichiers lui incombent.
      </p>
      <p>
        La responsabilité de {p.tradeName} est limitée aux dommages directs et plafonnée au montant payé par le client
        au cours des 12 mois précédant le fait qui l&apos;engage. Elle ne couvre pas les dommages indirects (perte de
        chiffre d&apos;affaires, de données, de clientèle ou d&apos;image).
      </p>

      <h2>Article 10. Support</h2>
      <p>
        Le support se fait par email à <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>, avec un objectif de
        réponse sous 48 heures ouvrées. Les questions techniques générales peuvent aussi passer par{" "}
        <a href={`${LEGAL.product.repo}/issues`} target="_blank" rel="noreferrer">GitHub</a>.
      </p>

      <h2>Article 11. Données personnelles</h2>
      <p>
        Les données de la commande (email, référence de paiement) servent à livrer la licence et à gérer
        l&apos;abonnement. Le détail est dans la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>Article 12. Modification des conditions</h2>
      <p>
        La version applicable est celle acceptée lors de la commande. Pour un abonnement, une nouvelle version est
        annoncée par email au moins 30 jours avant le renouvellement suivant ; le client peut résilier avant.
      </p>

      <h2>Article 13. Droit applicable et litiges</h2>
      <p>
        Les présentes conditions sont régies par le {LEGAL.jurisdiction.law}. En cas de difficulté, le client écrit
        d&apos;abord à <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a> pour chercher une solution amiable. À
        défaut, les {LEGAL.jurisdiction.court} sont compétents.
      </p>
    </>
  );
}
