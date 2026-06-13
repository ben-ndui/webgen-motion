import Link from "next/link";
import "./landing.css";
import ThemeToggle from "./_components/theme-toggle";
import LandingChrome, { type LandingSection } from "./_components/landing-chrome";
import LandingPrimaryCta from "./_components/landing-primary-cta";
import HeroCompileLoop from "./_components/hero-compile-loop";

/**
 * Landing v0.3 — positionnement « vidéos produit as code, régénérées à
 * chaque release » (spec : docs/design/LANDING-V3-WIREFRAME.md). On vend la
 * MÉCANIQUE, pas la catégorie : hero-promesse → preuve (méta-démo) →
 * La Boucle (ship → re-render) → pipeline (Edit Engine en vedette) →
 * personas → comparaison honnête → pricing anti-abonnement →
 * manifeste → CTA.
 *
 * Styling in ./landing.css (scoped .gm-landing, token-driven →
 * light/dark for free). Client behaviour (reveals, dots, nav) in
 * <LandingChrome>. data-wm-id partout pour la tour-abilité.
 */

const SECTIONS: LandingSection[] = [
  { id: "hero", label: "Hero" },
  { id: "demo", label: "Démo" },
  { id: "loop", label: "La boucle" },
  { id: "pipeline", label: "Pipeline" },
  { id: "personas", label: "Pour qui" },
  { id: "compare", label: "Comparer" },
  { id: "editions", label: "Éditions" },
  { id: "manifesto", label: "Manifeste" },
  { id: "ship", label: "Ship" },
];

const DOWNLOAD = "/download";
const GITHUB = "https://github.com/ben-ndui/webgen-motion";

function Check() {
  return (
    <span className="check" aria-hidden>
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GEN MOTION",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "macOS",
  url: "https://genmotion.app",
  description:
    "Outil desktop local-first pour générer des vidéos produit (web ou app native) : capture E2E, voix off IA, montage beat-synced. Régénérées à l'identique à chaque release.",
  offers: [
    { "@type": "Offer", name: "Community", price: "0", priceCurrency: "EUR" },
    { "@type": "Offer", name: "Studio — à vie", price: "199", priceCurrency: "EUR" },
    { "@type": "Offer", name: "Studio — annuel", price: "120", priceCurrency: "EUR" },
    { "@type": "Offer", name: "Studio — mensuel", price: "15", priceCurrency: "EUR" },
  ],
  publisher: {
    "@type": "Organization",
    name: "Smooth & Design",
    url: "https://genmotion.app",
  },
};

export default function LandingPage() {
  return (
    <div className="gm-landing" data-hero="a">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* NAV */}
      <nav className="nav" data-wm-id="landing.nav">
        <a className="brand" href="#hero" data-wm-id="landing.nav.brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">GEN&nbsp;MOTION</span>
        </a>
        <div className="nav-links" data-wm-id="landing.nav.links">
          <a className="nav-link" href="#loop">La boucle</a>
          <a className="nav-link" href="#pipeline">Pipeline</a>
          <a className="nav-link" href="#personas">Pour qui</a>
          <a className="nav-link" href="#editions">Éditions</a>
          <Link className="nav-link" href="/help">Documentation</Link>
        </div>
        <div className="nav-tools">
          <a className="nav-badge" href="#manifesto" data-wm-id="landing.nav.fsl">fair-code · FSL</a>
          <ThemeToggle />
          <LandingPrimaryCta className="btn btn-primary" label="short" data-wm-id="landing.nav.cta-download" />
        </div>
      </nav>

      <main className="scroller">
        {/* HERO — la promesse-mécanique */}
        <section className="section hero" id="hero" data-screen-label="Hero" data-wm-id="landing.hero">
          <div className="wrap">
            <div className="hero-a" data-wm-id="landing.hero.dir-a">
              <div className="kicker hero-eyebrow reveal">Motion Studio · local-first · web + mobile</div>
              <h1 className="hero-title reveal d1">
                Tes vidéos produit,<br />
                <span className="l2">écrites comme du&nbsp;code.</span>
              </h1>
              <p className="hero-sub reveal d2">
                GEN&nbsp;MOTION rejoue ton produit — site web ou app native —, pose la voix off,
                monte sur la musique. <b>Et le refait à l&apos;identique après chaque release.</b> En
                local, sans abonnement.
              </p>
              <div className="hero-cta reveal d3">
                <LandingPrimaryCta className="btn btn-primary btn-lg" data-wm-id="landing.hero.cta-download" />
                <a className="btn btn-ghost btn-lg" href="#loop">Voir la boucle&nbsp;↓</a>
              </div>
              <div className="reveal d4">
                <HeroCompileLoop />
              </div>
              <div className="spec-strip reveal d4" data-wm-id="landing.hero.specs">
                {[
                  ["Fair-code", "FSL · GitHub"],
                  ["Local-first", "0 cloud requis"],
                  ["Web + Mobile", "Puppeteer · Maestro"],
                  ["Montage", "Edit Engine"],
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

        {/* DÉMO — la preuve par soi-même */}
        <section className="section demo" id="demo" data-screen-label="Démo" data-wm-id="landing.demo">
          <div className="wrap">
            <div className="demo-head">
              <div>
                <div className="kicker reveal">La preuve par soi-même</div>
                <h2 className="demo-title reveal d1" style={{ marginTop: "var(--s-4)" }}>
                  Cette vidéo a été générée par l&apos;outil qu&apos;elle présente.
                </h2>
                <p className="demo-sub reveal d1">
                  Le pitch ci-dessous est un tour GEN&nbsp;MOTION&nbsp;: 9 sections scriptées en JSON,
                  capturées par Puppeteer, voix off ElevenLabs, montage automatique. Quand
                  l&apos;app change, on relance — la vidéo se régénère.{" "}
                  <a className="mono-link" href={`${GITHUB}/blob/main/tours/webgen-motion-pitch.json`} data-wm-id="landing.demo.source">
                    voir le tour source →
                  </a>
                </p>
              </div>
            </div>
            <div className="video-frame reveal d2" data-wm-id="landing.demo.player">
              <video
                className="video-el"
                src="/demo.mp4"
                poster="/demo-poster.jpg"
                controls
                preload="metadata"
                playsInline
              />
              <div className="video-meta">Pitch officiel · 102s · 1080p · 16:9</div>
            </div>
          </div>
        </section>

        {/* LA BOUCLE — ship → re-render */}
        <section className="section loop" id="loop" data-screen-label="La boucle" data-wm-id="landing.loop">
          <div className="wrap">
            <div className="loop-head reveal">
              <div className="kicker">Ship → re-render</div>
              <h2 className="loop-title">La vidéo de démo qui ne pourrit&nbsp;jamais.</h2>
              <p className="loop-sub">
                Un enregistrement manuel est mort à ton prochain redesign. Un tour
                GEN&nbsp;MOTION est du JSON versionné dans ton repo&nbsp;: ton produit change, tu
                relances, la vidéo est fraîche. Même voix, même musique, mêmes cuts.
              </p>
            </div>
            <div className="loop-strip reveal d1" data-wm-id="landing.loop.strip">
              <div className="loop-card" data-wm-id="landing.loop.v1">
                <span className="loop-tag">v1.0</span>
                <div className="loop-thumb" aria-hidden>
                  <span className="loop-play" />
                  <span className="loop-bar" />
                </div>
                <span className="loop-file">tour.json · final.mp4</span>
              </div>
              <div className="loop-commit" data-wm-id="landing.loop.commit" aria-hidden>
                <span className="loop-arrow" />
                <code>git commit -m &quot;feat: nouveau dashboard&quot;</code>
                <span className="loop-arrow" />
              </div>
              <div className="loop-card fresh" data-wm-id="landing.loop.v2">
                <span className="loop-tag">v1.1</span>
                <div className="loop-thumb fresh" aria-hidden>
                  <span className="loop-play" />
                  <span className="loop-bar" />
                </div>
                <span className="loop-file accent">re-render · 4 min</span>
              </div>
            </div>
            <div className="loop-benefits reveal d2" data-wm-id="landing.loop.benefits">
              <div><Check /> Une vidéo par release</div>
              <div><Check /> Une démo qui ne peut pas mentir — vraie app, vrais clics</div>
              <div><Check /> Industrialisable — 10 clients, 10 vidéos</div>
            </div>
          </div>
        </section>

        {/* PIPELINE — 4 étapes, Edit Engine en vedette */}
        <section className="section pipe" id="pipeline" data-screen-label="Pipeline" data-wm-id="landing.pipeline">
          <div className="wrap">
            <div className="pipe-head reveal">
              <div className="kicker">Comment ça marche</div>
              <h2 className="pipe-title">Quatre étapes.<br />Aucun cloud requis.</h2>
            </div>
            <div className="steps four">
              <article className="step reveal d1" data-wm-id="landing.pipeline.step-1">
                <span className="step-num">01 — Script</span>
                <div className="step-viz viz-capture" aria-hidden>
                  <div className="bar lg" /><div className="bar w1" /><div className="bar w3" /><div className="bar w2" />
                </div>
                <h3>Script</h3>
                <p>Décris ton tour en JSON — sections, clics, scrolls, voix off — ou laisse l&apos;agent IA l&apos;écrire pour toi. Le scénario vit dans ton repo, versionné.</p>
              </article>
              <article className="step reveal d2" data-wm-id="landing.pipeline.step-2">
                <span className="step-num">02 — Capture</span>
                <div className="step-viz viz-capture" aria-hidden>
                  <div className="bar lg" /><div className="bar w2" /><div className="bar w1" />
                  <div className="scan-mini" />
                </div>
                <h3>Capture</h3>
                <p>Puppeteer (web) ou Maestro (iOS / Android) rejouent ton produit, section par section. Chaque section devient un MP4 propre, frame-accurate.</p>
              </article>
              <article className="step reveal d3" data-wm-id="landing.pipeline.step-3">
                <span className="step-num">03 — Voix off</span>
                <div className="step-viz viz-voice" aria-hidden>
                  {Array.from({ length: 18 }).map((_, i) => <i key={i} />)}
                  <div className="ticks">{Array.from({ length: 8 }).map((_, i) => <span key={i} />)}</div>
                </div>
                <h3>Voix off</h3>
                <p>ElevenLabs (voix clonée) ou Voicebox 100% local. Alignement au mot près — overlays et sous-titres karaoké se calent sur la voix.</p>
              </article>
              <article className="step featured-step reveal d4" data-wm-id="landing.pipeline.step-4">
                <span className="step-num">04 — Edit Engine + Compose</span>
                <div className="step-viz viz-compose" aria-hidden>
                  <div className="mini-device"><span className="mini-play" /><span className="mini-time" /></div>
                </div>
                <h3>Un monteur dans le pipeline</h3>
                <p>Temps morts coupés, cuts calés sur les beats, J-cuts, crossfades adaptés à la musique — puis Remotion compose dans un device frame. Chaque décision est inspectable.</p>
                <code className="step-proof" data-wm-id="landing.pipeline.proof">
                  38.4s capturés → 22.1s montés · 4/4 cuts sur le beat
                </code>
              </article>
            </div>
            <p className="pipe-more reveal" data-wm-id="landing.pipeline.more">
              Aussi dans la boîte&nbsp;: frames 3D iPhone &amp; MacBook · hotspots punch-in ·
              sous-titres word-synced · export timeline <code>.otio</code> vers Resolve / Premiere.
            </p>
          </div>
        </section>

        {/* POUR QUI — 3 personas, 3 jobs */}
        <section className="section personas" id="personas" data-screen-label="Pour qui" data-wm-id="landing.personas">
          <div className="wrap">
            <div className="personas-head reveal">
              <div className="kicker">Pour qui</div>
              <h2 className="personas-title">Trois métiers, trois boucles.</h2>
            </div>
            <div className="persona-grid">
              <article className="persona reveal d1" data-wm-id="landing.personas.agences">
                <span className="persona-kicker">Agences &amp; studios</span>
                <h3>Livrez une vidéo de lancement avec chaque site.</h3>
                <p>
                  Un livrable facturable en plus du site — une vidéo motion 60s coûte 500 à
                  2&nbsp;000&nbsp;€ en prestation. Branding par client, captures sous NDA qui ne
                  quittent jamais votre machine.
                </p>
                <code className="persona-tag">white-label en Enterprise</code>
              </article>
              <article className="persona reveal d2" data-wm-id="landing.personas.founders">
                <span className="persona-kicker">Founders &amp; indie hackers</span>
                <h3>Une vidéo par release.</h3>
                <p>
                  Changelog vidéo, lancement Product Hunt, posts réseaux en 9:16 sous-titrés —
                  sans rouvrir un logiciel de montage à chaque update.
                </p>
                <code className="persona-tag">subtitles: true · 9:16</code>
              </article>
              <article className="persona reveal d3" data-wm-id="landing.personas.mobile">
                <span className="persona-kicker">Équipes mobile</span>
                <h3>Vos App Store previews, scriptés.</h3>
                <p>
                  Maestro pilote votre app dans le simulateur, GEN&nbsp;MOTION filme, monte et
                  habille dans un iPhone 3D. Re-générez à chaque version soumise.
                </p>
                <code className="persona-tag">platform: &quot;ios&quot; · Maestro</code>
              </article>
            </div>
          </div>
        </section>

        {/* COMPARAISON HONNÊTE */}
        <section className="section compare" id="compare" data-screen-label="Comparer" data-wm-id="landing.compare">
          <div className="wrap">
            <div className="compare-head reveal">
              <div className="kicker">Choisis le bon outil</div>
              <h2 className="compare-title">On n&apos;est pas fait pour tout le monde.</h2>
            </div>
            <div className="compare-scroll reveal d1">
              <table className="compare-table" data-wm-id="landing.compare.table">
                <thead>
                  <tr>
                    <th />
                    <th>Screen recorders</th>
                    <th>Démos interactives SaaS</th>
                    <th className="us">GEN MOTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Vous voulez…</td>
                    <td>une belle vidéo, une fois, à la main</td>
                    <td>des démos cliquables pour le marketing</td>
                    <td className="us">des vidéos <b>reproductibles</b> qui survivent aux releases</td>
                  </tr>
                  <tr>
                    <td>Méthode</td>
                    <td>enregistrement manuel</td>
                    <td>éditeur no-code, cloud</td>
                    <td className="us"><b>tour as code</b> — JSON dans git</td>
                  </tr>
                  <tr>
                    <td>Le produit change</td>
                    <td>ré-enregistrer</td>
                    <td>rééditer</td>
                    <td className="us"><b>re-render</b></td>
                  </tr>
                  <tr>
                    <td>Mobile natif</td>
                    <td>mirroring manuel</td>
                    <td>—</td>
                    <td className="us"><b>scripté</b> (Maestro)</td>
                  </tr>
                  <tr>
                    <td>Vos données</td>
                    <td>local</td>
                    <td>leur cloud</td>
                    <td className="us"><b>local, jamais uploadé</b></td>
                  </tr>
                  <tr>
                    <td>Prix</td>
                    <td>one-time</td>
                    <td>~38&nbsp;$/mois/siège</td>
                    <td className="us"><b>199&nbsp;€ à vie ou dès 15&nbsp;€/mois</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="compare-note reveal d2" data-wm-id="landing.compare.note">
              Si vous ne ferez qu&apos;<b>une</b> vidéo, prenez un screen recorder — sincèrement.
              Si vous shippez chaque semaine, on est fait pour vous.
            </p>
          </div>
        </section>

        {/* ÉDITIONS */}
        <section className="section pricing" id="editions" data-screen-label="Éditions" data-wm-id="landing.pricing">
          <div className="wrap">
            <div className="pricing-head reveal">
              <div className="kicker">Éditions</div>
              <h2 className="pricing-title">Un outil qu&apos;on possède.<br />Ou qu&apos;on prend au mois.</h2>
              <p className="pricing-sub" data-wm-id="landing.pricing.sub">
                Le SaaS d&apos;en face&nbsp;: ~456&nbsp;$/an/siège. GEN&nbsp;MOTION Studio&nbsp;:
                199&nbsp;€ à vie (tu le possèdes), ou dès 15&nbsp;€/mois si tu préfères étaler.
              </p>
            </div>
            <div className="tiers">
              <article className="tier reveal d1" data-wm-id="landing.pricing.community">
                <span className="tier-name">Community</span>
                <div className="tier-price"><span className="amt">Gratuit</span></div>
                <p className="tier-note">Fair-code · FSL · MIT après 2 ans</p>
                <ul className="feat">
                  <li><Check /> Pipeline complet capture + voix off + montage</li>
                  <li><Check /> Web (Puppeteer) + mobile natif (Maestro)</li>
                  <li><Check /> Edit Engine — trims, beats, J-cuts</li>
                  <li><Check /> Presets Sober + Energetic · 16:9 + 9:16</li>
                  <li><Check /> Agent IA (BYOK Claude) · scaffold projet</li>
                </ul>
                <LandingPrimaryCta className="btn btn-soft btn-lg btn-block" label="short" data-wm-id="landing.pricing.community-cta" />
              </article>
              <article className="tier featured reveal d2" data-wm-id="landing.pricing.studio">
                <span className="tier-name">Studio</span>
                <div className="tier-price"><span className="amt">199&nbsp;€</span><span className="per">à vie</span></div>
                <p className="tier-note">perpétuel · ou dès 15&nbsp;€/mois</p>
                <ul className="feat">
                  <li className="plus"><Check /> Tout Community, plus&nbsp;:</li>
                  <li><Check /> Export timeline <b>.otio</b> — Resolve / Premiere</li>
                  <li><Check /> Frames 3D iPhone &amp; MacBook</li>
                  <li><Check /> Presets Cinematic &amp; Glitch</li>
                  <li><Check /> Music library · multi-format · sans watermark</li>
                </ul>
                <Link className="btn btn-primary btn-lg btn-block" href={DOWNLOAD}>Voir les offres Studio</Link>
              </article>
            </div>
            <div className="enterprise-line reveal d3" data-wm-id="landing.pricing.enterprise">
              <p><b>Enterprise.</b> White-label, API headless ou SSO ? On construit avec vous.</p>
              <Link className="btn btn-ghost" href="/about">Voir Enterprise</Link>
            </div>
          </div>
        </section>

        {/* MANIFESTE */}
        <section className="section manifesto" id="manifesto" data-screen-label="Manifeste" data-wm-id="landing.manifesto">
          <div className="wrap">
            <div className="manifesto-head reveal">
              <div className="kicker">Ce qu&apos;on défend</div>
              <h2 className="manifesto-title">Trois principes, non négociables.</h2>
            </div>
            <div className="manifesto-grid">
              <div className="manifesto-col reveal d1" data-wm-id="landing.manifesto.local">
                <h3>Local-first, vraiment.</h3>
                <p>
                  Captures, voix, renders&nbsp;: tout reste sur ta machine. Aucun compte requis
                  pour le pipeline. Tes démos clients sous NDA ne transitent par aucun cloud.
                </p>
              </div>
              <div className="manifesto-col reveal d2" data-wm-id="landing.manifesto.faircode">
                <h3>Fair-code.</h3>
                <p>
                  Code source lisible et auditable (licence FSL). Chaque version devient MIT
                  après 2&nbsp;ans — pas de rug-pull possible, c&apos;est dans la licence.{" "}
                  <a className="mono-link" href={GITHUB}>github →</a>
                </p>
              </div>
              <div className="manifesto-col reveal d3" data-wm-id="landing.manifesto.clientzero">
                <h3>Client zéro.</h3>
                <p>
                  GEN&nbsp;MOTION est né dans une agence — Smooth &amp; Design, Nice — qui livrait
                  des sites et voulait livrer leurs vidéos. On l&apos;utilise tous les jours pour
                  nos propres clients.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section cta" id="ship" data-screen-label="Ship" data-wm-id="landing.cta">
          <div className="wrap">
            <div className="kicker reveal">Ready to ship&nbsp;?</div>
            <h2 className="cta-title reveal d1">Ta prochaine release mérite sa&nbsp;vidéo.</h2>
            <div className="cta-row reveal d2">
              <LandingPrimaryCta className="btn btn-primary btn-lg" data-wm-id="landing.cta.download" />
              <Link className="btn btn-ink btn-lg" href={DOWNLOAD}>Voir les offres Studio</Link>
              <Link className="btn btn-ghost btn-lg" href="/help">Lire la documentation</Link>
            </div>
            <span className="cta-sub reveal d3">macOS Apple Silicon · .dmg notarisé · source-available FSL · made in Nice</span>
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
              <a href={GITHUB}>GitHub</a>
            </div>
            <span className="footer-meta">genmotion.app · Smooth &amp; Design · Nice</span>
          </div>
        </footer>
      </main>

      <LandingChrome sections={SECTIONS} />
    </div>
  );
}
