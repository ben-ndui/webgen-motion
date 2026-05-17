import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import SlidesCarousel from "./_components/slides-carousel";
import BuyButton from "./_components/buy-button";
import SmartDownloadButton from "./_components/smart-download-button";

/**
 * Landing — Sprint 13 redesign en carrousel horizontal 5 slides.
 *
 * Direction artistique alignée sur smoothandesign.fr : noir & blanc
 * strict, zéro gradient, layouts asymétriques, grosses typos display.
 *
 * 5 slides : Hero · Démo · Comment ça marche · Pricing · CTA final.
 * Navigation : flèches ← → + clavier + swipe + dots. Auto-play 5s
 * pause-on-hover. Indications IA via data-tour-section + data-wm-id.
 *
 * Toutes les slides sont en DOM (rendered via SlidesCarousel children),
 * crawlers lisent le contenu complet — SEO friendly même si carrousel.
 */
export default function LandingPage() {
  // En prod Vercel = vitrine commerciale → boutons download direct (SmartDownloadButton).
  // En local dev (npm run dev) = app desktop ou test = "Lancer le studio" pointe sur le dashboard.
  const isWeb = process.env.VERCEL === "1";
  const studioHref = isWeb ? "/download" : "/dashboard";
  const studioLabel = isWeb ? "Télécharger l'app" : "Lancer le studio";

  // Réutilisé dans Hero CTA + Pricing Community card + CTA final
  const primaryCta = isWeb ? (
    <SmartDownloadButton variant="primary" showHint={false} />
  ) : (
    <Link
      href={studioHref}
      className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
    >
      {studioLabel}
      <ArrowRight className="w-4 h-4" />
    </Link>
  );

  return (
    <>
      <SlidesCarousel slideLabels={["hero", "demo", "how", "pricing", "cta"]}>
        {/* SLIDE 1 — HERO */}
        <SlideShell>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 h-full items-center">
            <div className="lg:col-span-8 xl:col-span-7">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8 sm:mb-10">
                Motion Studio · local-first · 2026
              </p>
              <h1 className="text-[44px] sm:text-[80px] xl:text-[112px] font-medium leading-[0.95] tracking-[-0.04em] text-zinc-950 mb-8 sm:mb-10">
                On capture votre site.
                <br />
                <span className="text-zinc-400">
                  Vous obtenez un clip motion.
                </span>
              </h1>
              <p className="max-w-xl text-base sm:text-lg text-zinc-700 leading-relaxed mb-10">
                GEN MOTION film n&apos;importe quelle interface web, mixe la
                voix off clonée, compose en clip vidéo prêt à publier.{" "}
                <strong className="text-zinc-950 font-medium">
                  Sur votre machine.
                </strong>{" "}
                Sans cloud, sans vendor lock-in.
              </p>
              <div className="flex items-center gap-6">
                {primaryCta}
                <Link
                  href="/help"
                  className="text-sm text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
                >
                  Documentation
                </Link>
              </div>
            </div>
            <aside className="hidden lg:flex lg:col-span-4 xl:col-span-5 lg:pl-10 lg:border-l lg:border-zinc-200 self-end pt-6 lg:pt-0 flex-col">
              <dl className="space-y-5 text-sm">
                <Meta label="Open-core" value="MIT · GitHub" />
                <Meta label="Stack" value="Remotion · Puppeteer · FFmpeg" />
                <Meta label="Backend voix off" value="ElevenLabs ou Voicebox" />
                <Meta label="Sortie" value="MP4 frame-accurate, 16:9 / 9:16" />
                <Meta label="Made in" value="Nice · Smooth & Design" />
              </dl>
            </aside>
          </div>
        </SlideShell>

        {/* SLIDE 2 — DÉMO */}
        <SlideShell>
          <div className="h-full flex flex-col">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6">
              Démo · 100 secondes
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium leading-tight tracking-[-0.02em] text-zinc-950 mb-2 max-w-3xl">
              GEN MOTION filme sa propre interface
              <span className="text-zinc-400">
                {" "}
                — voix off ElevenLabs, style Energetic, sortie 1080p.
              </span>
            </h2>
            <div className="flex-1 flex items-center justify-center py-6">
              <div className="w-full max-w-5xl aspect-video bg-zinc-950 border border-zinc-200 overflow-hidden">
                <video
                  src="/demo.mp4"
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                  data-wm-id="landing.demo.video"
                />
              </div>
            </div>
          </div>
        </SlideShell>

        {/* SLIDE 3 — COMMENT ÇA MARCHE */}
        <SlideShell>
          <div className="h-full flex flex-col">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6">
              Comment ça marche
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium leading-tight tracking-[-0.02em] text-zinc-950 mb-10 max-w-3xl">
              Trois étapes.
              <br />
              <span className="text-zinc-400">Aucun cloud requis.</span>
            </h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 flex-1 items-start">
              <Step
                n="01"
                title="Capture"
                detail="Puppeteer film votre site section par section. Vous décrivez ce que vous voulez voir, l'app navigue, scroll, hover, click. Chaque section devient un MP4 propre."
              />
              <Step
                n="02"
                title="Voix off"
                detail="ElevenLabs clone votre voix (ou utilise une voix stock) en mode narratif continu. Alignment char-level, vos overlays se cale au mot près sur la voix."
              />
              <Step
                n="03"
                title="Compose"
                detail="Remotion assemble dans un device frame (Mac chrome ou iPhone), applique un preset visuel parmi 4, mixe l'audio. Final.mp4 prêt à publier."
              />
            </ol>
          </div>
        </SlideShell>

        {/* SLIDE 4 — PRICING */}
        <SlideShell>
          <div className="h-full flex flex-col">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6">
              Editions
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium leading-tight tracking-[-0.02em] text-zinc-950 mb-10 max-w-3xl">
              Community gratuite.
              <br />
              <span className="text-zinc-400">
                Studio pour aller plus loin.
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 flex-1">
              <PricingCard
                name="Community"
                price="Gratuit"
                cta={
                  isWeb ? (
                    <SmartDownloadButton variant="secondary" showHint={false} />
                  ) : undefined
                }
                ctaLabel={isWeb ? undefined : studioLabel}
                ctaHref={isWeb ? undefined : studioHref}
                features={[
                  "Pipeline capture + voix off + compose",
                  "Presets Sober + Energetic",
                  "Formats 16:9 + 9:16",
                  "Agent IA (BYOK Claude)",
                  "Scaffold projet, recapture, trim, reorder",
                  "Local-first total",
                ]}
              />
              <PricingCard
                name="Studio"
                price="$49"
                priceNote="paiement unique perpétuel · mises à jour à vie"
                highlight
                cta={<BuyButton variant="primary" label="Acheter Studio · $49" />}
                features={[
                  "Tout Community +",
                  "Frames 3D iPhone & MacBook",
                  "Presets Cinematic & Glitch",
                  "Multi-format export simultané",
                  "Music library managée",
                  "Watermark removal",
                ]}
              />
            </div>
            <p className="mt-6 text-xs text-zinc-500">
              Besoin d&apos;un white-label, API headless ou SSO ? Voir{" "}
              <Link
                href="/about"
                className="text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
              >
                Enterprise
              </Link>{" "}
              ou écris à{" "}
              <a
                href="mailto:contact@smoothandesign.fr"
                className="text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
              >
                contact@smoothandesign.fr
              </a>
              .
            </p>
          </div>
        </SlideShell>

        {/* SLIDE 5 — CTA FINAL */}
        <SlideShell>
          <div className="h-full flex flex-col">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-10">
              Ready to ship ?
            </p>
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-[44px] sm:text-[80px] xl:text-[96px] font-medium leading-[0.95] tracking-[-0.04em] text-zinc-950 mb-10">
                Votre prochain clip motion
                <br />
                <span className="text-zinc-400">est à 5 minutes.</span>
              </h2>
              <div className="flex flex-wrap items-center gap-4 mb-10">
                {isWeb ? (
                  <SmartDownloadButton variant="primary" showHint={true} />
                ) : (
                  <Link
                    href={studioHref}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    {studioLabel}
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                )}
                <BuyButton variant="secondary" />
                <Link
                  href="/help"
                  className="text-sm text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
                >
                  Lire la documentation
                </Link>
              </div>
              <p className="text-sm text-zinc-500 max-w-2xl">
                <strong className="text-zinc-700 font-medium">
                  Open-source · MIT · made in Nice.
                </strong>{" "}
                GEN MOTION est sur{" "}
                <a
                  href="https://github.com/ben-ndui/webgen-motion"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
                >
                  GitHub
                </a>
                . Studio Edition débloque les outils pro.
              </p>
            </div>
            <footer className="mt-auto pt-8 border-t border-zinc-200 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500">
              <Link href="/about" className="hover:text-zinc-950 transition-colors">
                À propos
              </Link>
              <Link href="/help" className="hover:text-zinc-950 transition-colors">
                Doc
              </Link>
              <Link href="/mentions-legales" className="hover:text-zinc-950 transition-colors">
                Mentions
              </Link>
              <Link href="/confidentialite" className="hover:text-zinc-950 transition-colors">
                Confidentialité
              </Link>
              <Link href="/cgu" className="hover:text-zinc-950 transition-colors">
                CGU
              </Link>
              <Link href="/cgv" className="hover:text-zinc-950 transition-colors">
                CGV
              </Link>
              <a
                href="https://github.com/ben-ndui/webgen-motion"
                target="_blank"
                rel="noreferrer"
                className="hover:text-zinc-950 transition-colors"
              >
                GitHub
              </a>
              <span className="ml-auto text-zinc-400">
                genmotion.app · Smooth &amp; Design · Nice
              </span>
            </footer>
          </div>
        </SlideShell>
      </SlidesCarousel>
    </>
  );
}

/** Shell partagé : padding cohérent + max-width + brand badge top-left.
 *  Chaque slide hérite de la même grille pour rester aligné dans le
 *  flux DA noir & blanc. */
function SlideShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 sm:py-16 h-full flex flex-col">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center font-semibold text-sm tracking-tight text-zinc-950"
          >
            GEN MOTION
            <span className="hidden sm:inline ml-2 text-zinc-400 font-normal">
              — Smooth &amp; Design
            </span>
          </Link>
        </header>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 pt-0.5">
        {label}
      </dt>
      <dd className="text-zinc-900">{value}</dd>
    </div>
  );
}

function Step({
  n,
  title,
  detail,
}: {
  n: string;
  title: string;
  detail: string;
}) {
  return (
    <li
      className="border-t-2 border-zinc-950 pt-5"
      data-wm-id={`landing.step.${n}`}
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
        {n}
      </p>
      <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950 mb-4">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
        {detail}
      </p>
    </li>
  );
}

function PricingCard({
  name,
  price,
  priceNote,
  features,
  highlight,
  cta,
  ctaLabel,
  ctaHref,
}: {
  name: string;
  price: string;
  priceNote?: string;
  features: string[];
  highlight?: boolean;
  cta?: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div
      className={`flex flex-col p-6 sm:p-8 border ${
        highlight ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 bg-white"
      }`}
      data-wm-id={`landing.pricing.${name.toLowerCase()}`}
    >
      <div className="mb-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2">
          Edition
        </p>
        <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950 mb-2">
          {name}
        </h3>
        <p className="text-3xl font-semibold tracking-tight text-zinc-950">
          {price}
        </p>
        {priceNote && (
          <p className="text-xs text-zinc-500 mt-1">{priceNote}</p>
        )}
      </div>
      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {cta ? (
        <div>{cta}</div>
      ) : ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
            highlight
              ? "bg-zinc-950 text-white hover:bg-zinc-800"
              : "border border-zinc-300 text-zinc-950 hover:bg-zinc-50"
          }`}
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      ) : null}
    </div>
  );
}
