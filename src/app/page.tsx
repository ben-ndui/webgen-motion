import Link from "next/link";
import "./landing.css";
import ThemeToggle from "./_components/theme-toggle";
import LandingChrome, { type LandingSection } from "./_components/landing-chrome";
import LandingDownloadCta from "./_components/landing-download-cta";

/**
 * Landing — Phase 4 portage. Vertical scroll-snap sections (Direction A
 * "Statement" hero) faithful to design_handoff_genmotion/GEN MOTION
 * Landing.html. Styling in ./landing.css (scoped under .gm-landing,
 * token-driven → light/dark for free). Client behaviour (reveals, active
 * dot, nav scrolled) in <LandingChrome>. data-wm-id kept for tour-ability.
 */

const SECTIONS: LandingSection[] = [
  { id: "hero", label: "Hero" },
  { id: "demo", label: "Démo" },
  { id: "pipeline", label: "Pipeline" },
  { id: "editions", label: "Éditions" },
  { id: "ship", label: "Ship" },
];

const DOWNLOAD = "/download";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function Check() {
  return (
    <span className="check" aria-hidden>
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="gm-landing" data-hero="a">
      {/* NAV */}
      <nav className="nav" data-wm-id="landing.nav">
        <a className="brand" href="#hero" data-wm-id="landing.nav.brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">GEN&nbsp;MOTION</span>
        </a>
        <div className="nav-links" data-wm-id="landing.nav.links">
          <a className="nav-link" href="#demo">Démo</a>
          <a className="nav-link" href="#pipeline">Pipeline</a>
          <a className="nav-link" href="#editions">Éditions</a>
          <Link className="nav-link" href="/help">Documentation</Link>
        </div>
        <div className="nav-tools">
          <ThemeToggle />
          <Link className="btn btn-primary" href={DOWNLOAD} data-wm-id="landing.nav.cta-download">
            <DownloadIcon />
            Télécharger
          </Link>
        </div>
      </nav>

      <main className="scroller">
        {/* HERO */}
        <section className="section hero" id="hero" data-screen-label="Hero" data-wm-id="landing.hero">
          <div className="wrap">
            <div className="hero-a" data-wm-id="landing.hero.dir-a">
              <div className="kicker hero-eyebrow reveal">Motion Studio · local-first · 2026</div>
              <h1 className="hero-title reveal d1">
                On capture votre&nbsp;site.<br />
                <span className="l2">Vous obtenez un clip&nbsp;motion.</span>
              </h1>
              <p className="hero-sub reveal d2">
                GEN&nbsp;MOTION filme n&apos;importe quelle interface web, mixe la voix off clonée,
                compose en clip vidéo prêt à publier. <b>Sur votre machine.</b> Sans cloud, sans vendor&nbsp;lock-in.
              </p>
              <div className="hero-cta reveal d3">
                <LandingDownloadCta className="btn btn-primary btn-lg" data-wm-id="landing.hero.cta-download" />
                <a className="btn btn-ghost btn-lg" href="#demo">Voir la démo</a>
              </div>
              <div className="spec-strip reveal d4" data-wm-id="landing.hero.specs">
                {[
                  ["Open-core", "MIT · GitHub"],
                  ["Stack", "Remotion · Puppeteer · FFmpeg"],
                  ["Voix off", "ElevenLabs ou Voicebox"],
                  ["Sortie", "MP4 frame-accurate · 16:9 / 9:16"],
                  ["Made in", "Nice · Smooth & Design"],
                ].map(([k, v]) => (
                  <div className="spec" key={k}>
                    <span className="spec-k">{k}</span>
                    <span className="spec-v">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* DÉMO */}
        <section className="section demo" id="demo" data-screen-label="Démo" data-wm-id="landing.demo">
          <div className="wrap">
            <div className="demo-head">
              <div>
                <div className="kicker reveal">Démo · 100 secondes</div>
                <h2 className="demo-title reveal d1" style={{ marginTop: "var(--s-4)" }}>
                  GEN&nbsp;MOTION filme sa propre interface — voix off ElevenLabs, style Energetic, sortie&nbsp;1080p.
                </h2>
              </div>
            </div>
            <div className="video-frame reveal d2" data-wm-id="landing.demo.player">
              <div className="video-ph">
                <div className="video-play" role="button" aria-label="Lire la démo" tabIndex={0} />
              </div>
              <div className="video-meta">demo.mp4 · 100s · 1080p · 16:9</div>
              <div className="video-note">slot · /demo.mp4</div>
            </div>
          </div>
        </section>

        {/* PIPELINE */}
        <section className="section pipe" id="pipeline" data-screen-label="Pipeline" data-wm-id="landing.pipeline">
          <div className="wrap">
            <div className="pipe-head reveal">
              <div className="kicker">Comment ça marche</div>
              <h2 className="pipe-title">Trois étapes.<br />Aucun cloud requis.</h2>
            </div>
            <div className="steps">
              <article className="step reveal d1" data-wm-id="landing.pipeline.step-1">
                <span className="step-num">01 — Capture</span>
                <div className="step-viz viz-capture" aria-hidden>
                  <div className="bar lg" /><div className="bar w1" /><div className="bar w3" /><div className="bar w2" />
                  <div className="scan-mini" />
                </div>
                <h3>Capture</h3>
                <p>Puppeteer filme votre site section par section. Vous décrivez ce que vous voulez voir, l&apos;app navigue, scroll, hover, click. Chaque section devient un MP4 propre.</p>
              </article>
              <article className="step reveal d2" data-wm-id="landing.pipeline.step-2">
                <span className="step-num">02 — Voix off</span>
                <div className="step-viz viz-voice" aria-hidden>
                  {Array.from({ length: 18 }).map((_, i) => <i key={i} />)}
                  <div className="ticks">{Array.from({ length: 8 }).map((_, i) => <span key={i} />)}</div>
                </div>
                <h3>Voix off</h3>
                <p>ElevenLabs clone votre voix (ou une voix stock) en mode narratif continu. Alignment char-level&nbsp;: vos overlays se calent au mot près sur la voix.</p>
              </article>
              <article className="step reveal d3" data-wm-id="landing.pipeline.step-3">
                <span className="step-num">03 — Compose</span>
                <div className="step-viz viz-compose" aria-hidden>
                  <div className="mini-device"><span className="mini-play" /><span className="mini-time" /></div>
                </div>
                <h3>Compose</h3>
                <p>Remotion assemble dans un device frame (Mac chrome ou iPhone), applique un preset visuel parmi 4, mixe l&apos;audio. Final.mp4 prêt à publier.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ÉDITIONS */}
        <section className="section pricing" id="editions" data-screen-label="Éditions" data-wm-id="landing.pricing">
          <div className="wrap">
            <div className="pricing-head reveal">
              <div className="kicker">Éditions</div>
              <h2 className="pricing-title">Community gratuite.<br />Studio pour aller plus loin.</h2>
            </div>
            <div className="tiers">
              <article className="tier reveal d1" data-wm-id="landing.pricing.community">
                <span className="tier-name">Community</span>
                <div className="tier-price"><span className="amt">Gratuit</span></div>
                <p className="tier-note">Open-core · MIT · pour toujours</p>
                <ul className="feat">
                  <li><Check /> Pipeline capture + voix off + compose</li>
                  <li><Check /> Presets Sober + Energetic</li>
                  <li><Check /> Formats 16:9 + 9:16</li>
                  <li><Check /> Agent IA (BYOK Claude)</li>
                  <li><Check /> Scaffold, recapture, trim, reorder</li>
                </ul>
                <Link className="btn btn-soft btn-lg btn-block" href={DOWNLOAD}>Télécharger</Link>
              </article>
              <article className="tier featured reveal d2" data-wm-id="landing.pricing.studio">
                <span className="tier-name">Studio</span>
                <div className="tier-price"><span className="amt">$49</span><span className="per">paiement unique</span></div>
                <p className="tier-note">perpétuel · mises à jour à vie</p>
                <ul className="feat">
                  <li className="plus"><Check /> Tout Community, plus&nbsp;:</li>
                  <li><Check /> Frames 3D iPhone &amp; MacBook</li>
                  <li><Check /> Presets Cinematic &amp; Glitch</li>
                  <li><Check /> Multi-format export simultané</li>
                  <li><Check /> Music library managée · watermark removal</li>
                </ul>
                <Link className="btn btn-primary btn-lg btn-block" href={DOWNLOAD}>Acheter Studio · $49</Link>
              </article>
            </div>
            <div className="enterprise-line reveal d3" data-wm-id="landing.pricing.enterprise">
              <p><b>Enterprise.</b> White-label, API headless ou SSO ? On construit avec vous.</p>
              <Link className="btn btn-ghost" href="/about">Voir Enterprise</Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section cta" id="ship" data-screen-label="Ship" data-wm-id="landing.cta">
          <div className="wrap">
            <div className="kicker reveal">Ready to ship&nbsp;?</div>
            <h2 className="cta-title reveal d1">Votre prochain clip motion est à 5&nbsp;minutes.</h2>
            <div className="cta-row reveal d2">
              <LandingDownloadCta className="btn btn-primary btn-lg" data-wm-id="landing.cta.download" />
              <Link className="btn btn-ink btn-lg" href={DOWNLOAD}>Acheter Studio · $49</Link>
              <Link className="btn btn-ghost btn-lg" href="/help">Lire la documentation</Link>
            </div>
            <span className="cta-sub reveal d3">macOS Apple Silicon · .dmg notarisé · open-source MIT · made in Nice</span>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer" data-wm-id="landing.footer">
          <div className="wrap">
            <a className="brand" href="#hero">
              <span className="brand-mark" aria-hidden />
              <span className="brand-name">GEN&nbsp;MOTION</span>
            </a>
            <div className="footer-links">
              <Link href="/about">À propos</Link>
              <Link href="/help">Doc</Link>
              <Link href="/mentions-legales">Mentions</Link>
              <Link href="/confidentialite">Confidentialité</Link>
              <Link href="/cgu">CGU</Link>
              <Link href="/cgv">CGV</Link>
              <a href="https://github.com/ben-ndui/webgen-motion">GitHub</a>
            </div>
            <span className="footer-meta">genmotion.app · Smooth &amp; Design · Nice</span>
          </div>
        </footer>
      </main>

      <LandingChrome sections={SECTIONS} />
    </div>
  );
}
