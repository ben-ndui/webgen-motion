import Link from "next/link";
import "./landing.css";
import "./accueil.css";
import AccueilHero from "./_components/accueil/accueil-hero";
import CeQuIlFabrique from "./_components/accueil/ce-qu-il-fabrique";
import { CommentCaMarche, Confiance } from "./_components/accueil/comment-et-confiance";
import FinDePage from "./_components/accueil/fin-de-page";
import Prix from "./_components/accueil/prix";
import LandingChrome, { type LandingSection } from "./_components/landing-chrome";
import LandingPrimaryCta from "./_components/landing-primary-cta";
import ThemeToggle from "./_components/theme-toggle";

/**
 * L'accueil de genmotion.app (refonte du 15/10/2026, direction B validée par
 * Ben) : on vend le RÉSULTAT à des marques et des agences, pas l'outil à des
 * développeurs. Ce qu'on obtient → la preuve (le film S&D fait par GEN MOTION)
 * → ce qu'il fabrique → comment → ce qu'on garde → prix → une seule action.
 * Le technique (tours JSON, CLI) vit dans la documentation.
 *
 * Règle : chaque affirmation se vérifie dans le code ou dans un vrai rendu.
 */
const SECTIONS: LandingSection[] = [
  { id: "hero", label: "Accueil" },
  { id: "fabrique", label: "Ce qu'il fabrique" },
  { id: "comment", label: "Comment" },
  { id: "confiance", label: "Confiance" },
  { id: "prix", label: "Prix" },
  { id: "commencer", label: "Commencer" },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GEN MOTION",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "macOS",
  url: "https://genmotion.app",
  description:
    "App de bureau qui transforme ton site en film de marque et ta marque en série courte générée par IA : captures, textes, musique, montage, en 16:9 et 9:16.",
  offers: [
    { "@type": "Offer", name: "Community", price: "0", priceCurrency: "EUR" },
    { "@type": "Offer", name: "Studio, à vie", price: "199", priceCurrency: "EUR" },
    { "@type": "Offer", name: "Studio, annuel", price: "120", priceCurrency: "EUR" },
    { "@type": "Offer", name: "Studio, mensuel", price: "15", priceCurrency: "EUR" },
  ],
  publisher: { "@type": "Organization", name: "Smooth & Design", url: "https://genmotion.app" },
};

export default function LandingPage() {
  return (
    <div className="gm-landing" data-hero="a">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <nav className="nav" data-wm-id="landing.nav">
        <a className="brand" href="#hero" data-wm-id="landing.nav.brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">GEN&nbsp;MOTION</span>
        </a>
        <div className="nav-links" data-wm-id="landing.nav.links">
          <a className="nav-link" href="#fabrique">Ce qu&apos;il fabrique</a>
          <a className="nav-link" href="#comment">Comment</a>
          <a className="nav-link" href="#prix">Prix</a>
          <Link className="nav-link" href="/help">Documentation</Link>
        </div>
        <div className="nav-tools">
          <ThemeToggle />
          <LandingPrimaryCta className="btn btn-primary" label="short" data-wm-id="landing.nav.cta-download" />
        </div>
      </nav>

      <main className="scroller">
        <AccueilHero />
        <CeQuIlFabrique />
        <CommentCaMarche />
        <Confiance />
        <Prix />
        <FinDePage />
      </main>

      <LandingChrome sections={SECTIONS} />
    </div>
  );
}
