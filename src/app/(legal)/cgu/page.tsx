import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — GEN MOTION",
  description: "CGU du site genmotion.app et du logiciel GEN MOTION.",
};

export default function CGU() {
  const p = LEGAL.publisher;
  return (
    <>
      <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3">
        Document légal · maj {LEGAL.lastUpdated}
      </p>
      <h1>Conditions Générales d&apos;Utilisation</h1>

      <p>
        Les présentes Conditions Générales d&apos;Utilisation (« CGU »)
        régissent l&apos;utilisation du site <strong>{LEGAL.site.url}</strong>
        {" "}et du logiciel <strong>GEN MOTION</strong> édités par
        <strong> {p.tradeName}</strong>. L&apos;accès au site et le
        téléchargement du logiciel valent acceptation pleine et entière des
        présentes CGU.
      </p>

      <h2>Article 1 — Objet</h2>
      <p>
        GEN MOTION est un outil <strong>local-first</strong> permettant de
        générer des clips motion design à partir d&apos;interfaces web (sites,
        applications) capturées via Puppeteer, avec voix off synthétisée et
        compose Remotion. L&apos;utilisateur télécharge l&apos;app et la fait
        tourner sur sa propre machine.
      </p>

      <h2>Article 2 — Éditions</h2>
      <ul>
        <li>
          <strong>Community Edition</strong> ({LEGAL.product.editions.community.price}) :{" "}
          {LEGAL.product.editions.community.scope}.
        </li>
        <li>
          <strong>Studio Edition</strong> ({LEGAL.product.editions.studio.price}) :{" "}
          {LEGAL.product.editions.studio.scope}.
        </li>
        <li>
          <strong>Enterprise Edition</strong> ({LEGAL.product.editions.enterprise.price}) :{" "}
          {LEGAL.product.editions.enterprise.scope}.
        </li>
      </ul>
      <p>
        La license Studio Edition est <strong>perpétuelle</strong> (paiement
        unique, valable à vie sur les versions futures du produit). Elle est
        vérifiée localement par signature cryptographique Ed25519 — aucun
        appel réseau de validation.
      </p>

      <h2>Article 3 — Accès au service</h2>
      <p>
        Le site genmotion.app et le téléchargement de GEN MOTION sont
        accessibles 24h/24, sauf cas de force majeure, opération de
        maintenance ou panne d&apos;un de nos hébergeurs/sous-traitants.
        L&apos;éditeur ne peut être tenu responsable d&apos;une interruption
        de service.
      </p>

      <h2>Article 4 — Obligations de l&apos;utilisateur</h2>
      <p>L&apos;utilisateur s&apos;engage à :</p>
      <ul>
        <li>
          Ne pas utiliser GEN MOTION pour capturer ou exploiter du contenu
          dont il n&apos;a pas les droits (sites tiers protégés, données
          personnelles de tiers sans consentement, etc.).
        </li>
        <li>
          Ne pas tenter de contourner le système de license (signature Ed25519,
          edition flags).
        </li>
        <li>
          Respecter les conditions des services IA tiers (ElevenLabs, Claude)
          s&apos;il choisit de les activer avec sa propre clé API.
        </li>
      </ul>

      <h2>Article 5 — Responsabilité</h2>
      <p>
        GEN MOTION est fourni <strong>« en l&apos;état »</strong> (warranty
        disclaimer standard MIT). L&apos;éditeur ne garantit ni la conformité
        à un usage particulier, ni l&apos;absence de bugs, ni la
        compatibilité avec toutes les versions de macOS/Windows/Linux.
        L&apos;utilisateur est seul responsable de l&apos;usage qu&apos;il
        fait du logiciel et des contenus qu&apos;il génère.
      </p>

      <h2>Article 6 — Données personnelles</h2>
      <p>
        Le traitement des données personnelles est détaillé dans notre{" "}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Article 7 — Modification des CGU</h2>
      <p>
        L&apos;éditeur se réserve le droit de modifier les présentes CGU à
        tout moment. La version applicable est celle accessible sur le site
        au jour de votre utilisation. Date de dernière mise à jour :{" "}
        <strong>{LEGAL.lastUpdated}</strong>.
      </p>

      <h2>Article 8 — Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le {LEGAL.jurisdiction.law}. Tout
        litige relèvera de la compétence exclusive des{" "}
        {LEGAL.jurisdiction.court}.
      </p>

      <h2>Article 9 — Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU, contactez-nous à{" "}
        <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>.
      </p>
    </>
  );
}
