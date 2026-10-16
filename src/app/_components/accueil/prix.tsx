import Link from "next/link";

import { PRIX_STUDIO, euros } from "@/lib/offre-studio";

import LandingPrimaryCta from "../landing-primary-cta";

/**
 * Les deux éditions, avec ce qui justifie de payer en tête de Studio : le
 * film de marque et la série. Les prix viennent de `src/lib/offre-studio.ts`,
 * la même source que la page d'achat et les CGV.
 */
function Coche() {
  return (
    <span className="check" aria-hidden>
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

const COMMUNITY = [
  "Vidéo de ton produit : capture web et mobile, voix off, montage sur la musique",
  "Quatre styles de montage, dont Cinematic et Glitch",
  "16:9 et 9:16",
  "Gratuit, sans limite de durée",
];
// Seulement ce que le code réserve VRAIMENT à Studio (isFeatureEnabled) : film-de-marque,
// cinema-ia, frames-3d, otio-export. Le reste est déjà dans Community.
const STUDIO = [
  "Le film de ta marque depuis l'adresse de ton site",
  "La série IA : casting, épisodes, répliques en français",
  "Cadres 3D iPhone et MacBook",
  "Export du montage vers DaVinci Resolve : vidéo produit, film et série",
];

export default function Prix() {
  return (
    <section className="section pricing" id="prix" data-screen-label="Prix" data-wm-id="landing.pricing">
      <div className="wrap">
        <div className="pricing-head reveal">
          <h2 className="accueil-titre">Gratuit pour commencer. Studio pour ta marque.</h2>
        </div>
        <div className="tiers">
          <article className="tier reveal d1" data-wm-id="landing.pricing.community">
            <span className="tier-name">Community</span>
            <div className="tier-price">
              <span className="amt">Gratuit</span>
            </div>
            <ul className="feat">
              {COMMUNITY.map((ligne) => (
                <li key={ligne}>
                  <Coche /> {ligne}
                </li>
              ))}
            </ul>
            <LandingPrimaryCta className="btn btn-soft btn-lg btn-block" label="short" data-wm-id="landing.pricing.community-cta" />
          </article>
          <article className="tier featured reveal d2" data-wm-id="landing.pricing.studio">
            <span className="tier-name">Studio</span>
            <div className="tier-price">
              <span className="amt">{euros(PRIX_STUDIO.aVie)}</span>
              <span className="per">à vie</span>
            </div>
            <p className="tier-note">
              ou {euros(PRIX_STUDIO.mensuel)} par mois sans engagement, ou {euros(PRIX_STUDIO.annuel)} par an
            </p>
            <ul className="feat">
              <li className="plus">
                <Coche /> Tout Community, plus&nbsp;:
              </li>
              {STUDIO.map((ligne) => (
                <li key={ligne}>
                  <Coche /> {ligne}
                </li>
              ))}
            </ul>
            {/* Droit aux trois offres : le haut de /download, c'est le téléchargement de l'app. */}
            <Link className="btn btn-primary btn-lg btn-block" href="/download#studio" data-wm-id="landing.pricing.studio-cta">
              Choisir mon offre Studio
            </Link>
          </article>
        </div>
        <p className="accueil-note reveal d3">
          Les générations IA (Google pour les vidéos, Claude pour les textes) se paient directement chez eux, avec tes clés, au prix
          coûtant. Une agence, une marque blanche ? <Link href="/about">Parlons-en</Link>.
        </p>
      </div>
    </section>
  );
}
