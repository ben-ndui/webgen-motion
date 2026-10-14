import Link from "next/link";

import LandingPrimaryCta from "../landing-primary-cta";

const GITHUB = "https://github.com/ben-ndui/webgen-motion";

/** La dernière invitation (une seule action), puis le pied de page. */
export default function FinDePage() {
  return (
    <>
      <section className="section cta" id="commencer" data-screen-label="Commencer" data-wm-id="landing.cta">
        <div className="wrap">
          <h2 className="cta-title reveal d1">Ton prochain film commence par une adresse.</h2>
          <div className="cta-row reveal d2">
            <LandingPrimaryCta className="btn btn-primary btn-lg" data-wm-id="landing.cta.download" />
          </div>
          <p className="cta-sub reveal d3">
            Gratuit pour commencer. <Link href="/help">Lire la documentation</Link>
          </p>
        </div>
      </section>

      <footer className="footer" data-wm-id="landing.footer">
        <div className="wrap">
          <a className="brand" href="#hero">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">GEN&nbsp;MOTION</span>
          </a>
          <div className="footer-links">
            <Link href="/about">À propos</Link>
            <Link href="/help">Documentation</Link>
            <Link href="/mentions-legales">Mentions</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/cgu">CGU</Link>
            <Link href="/cgv">CGV</Link>
            <a href={GITHUB}>Code source (licence FSL)</a>
          </div>
          <span className="footer-meta">genmotion.app · Smooth &amp; Design · Côte d&apos;Azur</span>
        </div>
      </footer>
    </>
  );
}
