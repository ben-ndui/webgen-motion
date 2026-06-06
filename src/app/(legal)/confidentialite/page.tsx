import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Politique de confidentialité — GEN MOTION",
  description: "Comment GEN MOTION traite vos données personnelles (RGPD).",
};

export default function Confidentialite() {
  const p = LEGAL.publisher;
  return (
    <>
      <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-faint mb-3">
        Document légal · maj {LEGAL.lastUpdated}
      </p>
      <h1>Politique de confidentialité</h1>

      <p>
        <strong>{p.tradeName}</strong> (ci-après <em>« nous »</em>) accorde la
        plus grande importance au respect de votre vie privée et à la protection
        de vos données personnelles. La présente politique décrit comment nous
        collectons, utilisons et protégeons vos données dans le cadre de
        l&apos;utilisation du site <strong>{LEGAL.site.url}</strong> et du
        logiciel <strong>GEN MOTION</strong>.
      </p>

      <h2>Philosophie local-first</h2>
      <p>
        <strong>GEN MOTION est un outil local-first.</strong> La quasi-totalité
        du traitement (capture E2E de votre site, synthèse de la voix off,
        compose Remotion, rendu final) tourne <strong>sur votre machine</strong>,
        sans qu&apos;aucune donnée ne transite par nos serveurs. Nous ne
        collectons, ne stockons et ne traitons pas vos captures, vos
        voix off, ni vos vidéos générées.
      </p>

      <h2>Données collectées via le site genmotion.app</h2>
      <p>Le site vitrine traite un volume très réduit de données :</p>
      <ul>
        <li>
          <strong>Logs techniques</strong> (IP, user-agent, status code) générés
          par notre hébergeur Vercel pour la sécurité et le debug. Conservés
          {" "}{LEGAL.data.retentionMonths} mois maximum.
        </li>
        <li>
          <strong>Données de paiement</strong> uniquement si vous achetez la
          Studio Edition — traitées exclusivement par Stripe (PCI DSS Level 1),
          nous ne stockons ni votre numéro de carte ni votre CVC. Nous
          recevons uniquement votre email et le montant pour générer votre
          license.
        </li>
        <li>
          <strong>Email de license</strong> conservé indéfiniment dans nos
          archives de license émises pour assurer le support et la
          réémission en cas de perte du fichier <code>.license</code>.
        </li>
      </ul>

      <h2>Données collectées via l&apos;app desktop GEN MOTION</h2>
      <p>
        L&apos;app desktop ne nous transmet <strong>aucune donnée</strong>{" "}
        d&apos;usage par défaut (pas de télémétrie, pas d&apos;analytics, pas
        de crash reports). Les seules connexions réseau initiées par l&apos;app
        sont :
      </p>
      <ul>
        <li>
          <strong>Vérification de license</strong> : aucune (signature Ed25519
          vérifiée localement, offline-first).
        </li>
        <li>
          <strong>Services IA optionnels que vous activez</strong> :
          ElevenLabs (voix off cloud) et Claude (Agent IA) reçoivent vos
          requêtes uniquement si vous configurez votre clé API personnelle
          (BYOK — bring your own key). Vous êtes alors responsable du
          traitement et soumis aux politiques de ces tiers.
        </li>
        <li>
          <strong>Capture E2E</strong> : Puppeteer accède aux URLs que vous
          ciblez (votre site, votre app) — ces requêtes sortent depuis votre
          machine, nous ne les voyons jamais.
        </li>
      </ul>

      <h2>Base légale du traitement (RGPD art. 6)</h2>
      <ul>
        <li>
          <strong>Exécution du contrat</strong> (art. 6.1.b) — pour la
          fourniture de la license Studio Edition après achat.
        </li>
        <li>
          <strong>Intérêt légitime</strong> (art. 6.1.f) — pour les logs
          techniques (sécurité, prévention abus, debug).
        </li>
        <li>
          <strong>Consentement</strong> (art. 6.1.a) — si vous activez
          volontairement les services IA optionnels avec votre clé API.
        </li>
      </ul>

      <h2>Sous-traitants</h2>
      <p>Nous nous appuyons sur les sous-traitants suivants :</p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Finalité</th>
            <th>Transfert</th>
          </tr>
        </thead>
        <tbody>
          {LEGAL.subprocessors.map((s) => (
            <tr key={s.name}>
              <td>
                <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
              </td>
              <td>{s.purpose}</td>
              <td>{s.transfer}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Vos droits (RGPD art. 15-22)</h2>
      <p>Vous disposez, à tout moment, des droits suivants sur vos données :</p>
      <ul>
        <li>Droit d&apos;accès (art. 15)</li>
        <li>Droit de rectification (art. 16)</li>
        <li>Droit à l&apos;effacement / oubli (art. 17)</li>
        <li>Droit à la limitation du traitement (art. 18)</li>
        <li>Droit à la portabilité (art. 20)</li>
        <li>Droit d&apos;opposition (art. 21)</li>
      </ul>
      <p>
        Pour exercer ces droits, écrivez-nous à{" "}
        <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>. Nous
        répondrons sous un délai maximum d&apos;un mois.
      </p>

      <h2>Réclamation auprès de la CNIL</h2>
      <p>
        Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
        respectés, vous pouvez adresser une réclamation à la{" "}
        <a href={LEGAL.data.cnilUrl} target="_blank" rel="noreferrer">
          Commission Nationale de l&apos;Informatique et des Libertés (CNIL)
        </a>.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site genmotion.app n&apos;utilise <strong>aucun cookie de
        tracking</strong> (pas d&apos;analytics tiers, pas de pixels
        publicitaires). Seuls des cookies techniques strictement nécessaires
        au fonctionnement (session Stripe checkout par exemple) peuvent être
        déposés temporairement par nos sous-traitants directs.
      </p>
    </>
  );
}
