import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

/**
 * Landing page — direction artistique alignée sur smoothandesign.fr :
 * noir & blanc strict, zero gradient, layouts asymétriques, grosses
 * typos display, espacement éditorial généreux, accents mono pour
 * marqueurs / chiffres. Aucune carte décorative, aucune icône
 * inutile — la page parle, le produit montre.
 *
 * Si tu reviens éditer : pas de couleurs, pas de gradient, pas
 * d'illustration générée. Le DA de Smooth & Design = sobriété
 * radicale. Le seul "media" qui parle = la démo vidéo.
 */
export default function LandingPage() {
  // En prod Vercel (vitrine publique), `process.env.VERCEL === "1"` →
  // les routes Studio/Dashboard ne fonctionnent pas (filesystem local
  // requis). On redirige les CTA vers /download, page qui pointe sur
  // les releases GitHub signées+notarisées. En local dev (npm run dev),
  // VERCEL n'est pas set → comportement original "Lancer le studio →
  // /dashboard".
  const isWeb = process.env.VERCEL === "1";
  const studioHref = isWeb ? "/download" : "/dashboard";
  const studioLabel = isWeb ? "Télécharger l'app" : "Lancer le studio";

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950">
      {/* Top bar — éditorial, peu d'ornement */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="font-semibold text-sm tracking-tight">
              GEN MOTION
              <span className="hidden sm:inline ml-2 text-zinc-400 font-normal">
                — Smooth &amp; Design
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/help"
                className="hidden sm:inline text-zinc-600 hover:text-zinc-950 transition-colors"
              >
                Doc
              </Link>
              <a
                href="https://github.com/ben-ndui/webgen-motion"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline text-zinc-600 hover:text-zinc-950 transition-colors"
              >
                GitHub
              </a>
              <Link
                href={studioHref}
                className="inline-flex items-center gap-1.5 text-zinc-950 font-medium hover:underline underline-offset-4 decoration-2"
              >
                {studioLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero — asymétrique, décalé à gauche, gros titre noir */}
      <section className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 sm:pt-32 pb-24 sm:pb-40 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-8 xl:col-span-7">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8 sm:mb-12">
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
              <Link
                href={studioHref}
                className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                {studioLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/help"
                className="text-sm text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
              >
                Lire la documentation
              </Link>
            </div>
          </div>

          {/* Side meta — décalé à droite, mono, très petit */}
          <aside className="lg:col-span-4 xl:col-span-5 lg:pl-10 lg:border-l lg:border-zinc-200 self-end pt-6 lg:pt-0">
            <dl className="space-y-5 text-sm">
              <Meta label="Open source" value="MIT · GitHub" />
              <Meta label="Stack" value="Remotion · Puppeteer · FFmpeg" />
              <Meta label="Voix off" value="ElevenLabs ou Voicebox local" />
              <Meta label="Studio" value="Nice, France" />
            </dl>
          </aside>
        </div>
      </section>

      {/* Démo — quasi pleine largeur, peu de chrome */}
      <section className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 sm:py-28">
          <div className="flex items-baseline justify-between gap-6 mb-8 sm:mb-12 flex-wrap">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500">
              · 100 s · pipeline complet
            </p>
            <Link
              href="/tour/webgen-motion-pitch"
              className="text-sm text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors inline-flex items-center gap-1"
            >
              Voir le tour source
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="border border-zinc-200 bg-zinc-950">
            <video
              src="/demo.mp4"
              controls
              playsInline
              preload="metadata"
              className="w-full block"
            />
          </div>
          <p className="mt-6 text-xs text-zinc-500 max-w-3xl leading-relaxed">
            Cette démo a été produite par GEN MOTION lui-même. Capture
            Puppeteer · voix off ElevenLabs en mode narratif (alignment
            char-level) · compose Remotion avec preset Energetic · 1920×1080
            h264. Le tour source est versionné dans le repo.
          </p>
        </div>
      </section>

      {/* L'approche — 3 blocs numérotés, asymétriques, sans card sans icône */}
      <section className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 sm:py-40 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6">
              L&apos;approche
            </p>
            <h2 className="text-4xl sm:text-5xl xl:text-6xl font-medium leading-[1] tracking-[-0.03em] text-zinc-950 mb-6">
              Un studio motion design,
              <br />
              taillé pour les devs.
            </h2>
            <p className="text-zinc-600 leading-relaxed max-w-md">
              Trois principes simples. Aucun marketing-tech-bro, aucune
              promesse magique. Ce qui marche, sur votre machine.
            </p>
          </div>

          <div className="lg:col-span-8 space-y-16 sm:space-y-24">
            <Pillar
              n="01"
              title="Local-first."
              body="Aucune donnée ne quitte votre machine. Puppeteer pour la capture, ElevenLabs ou Voicebox (100 % local) pour la voix off, FFmpeg + Remotion natifs pour l'encodage. Pas de cold start CI, pas de vendor lock-in, pas de quota."
            />
            <Pillar
              n="02"
              title="Cinq onglets, une timeline."
              body="Script, Capture, Audio, Voix off, Compose. L'édition est visuelle, le bouton Save est toujours visible, le mode narratif continu calibre votre timeline sur les timings caractère par caractère retournés par ElevenLabs. Rien à ré-écrire."
            />
            <Pillar
              n="03"
              title="Quatre presets de montage."
              body="Sober, Energetic, Cinematic, Glitch. La même capture peut sortir en quatre vidéos visuellement très différentes — un clic dans le tab Compose, un re-render Remotion, terminé."
            />
          </div>
        </div>
      </section>

      {/* Comment ça marche — timeline numérique pure texte */}
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 sm:py-40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 sm:mb-20">
            <div className="lg:col-span-4">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6">
                Comment ça marche
              </p>
              <h2 className="text-4xl sm:text-5xl xl:text-6xl font-medium leading-[1] tracking-[-0.03em] text-zinc-950">
                Cinq étapes.
                <br />
                Cinq minutes.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6 self-end">
              <p className="text-zinc-600 leading-relaxed max-w-md">
                Du clone à la première vidéo. Compte sur 5 minutes la première
                fois, 2 minutes les suivantes — la VO est mise en cache, les
                sections ré-utilisables.
              </p>
            </div>
          </div>

          <ol className="divide-y divide-zinc-200 border-t border-b border-zinc-200">
            <StepRow
              n="01"
              title="Scaffold"
              cmd="npx create-webgen-motion@latest my-promo"
            />
            <StepRow
              n="02"
              title="Backend voix off"
              detail="ElevenLabs cloud (qualité instantanée, char-level timings) ou Voicebox 100 % local (zéro données externes). Wizard guidé."
            />
            <StepRow
              n="03"
              title="Nouveau tour"
              detail="Slug, format 16:9 ou 9:16, brand préfilé. JSON scaffold. L'éditeur visuel prend le relais."
            />
            <StepRow
              n="04"
              title="Capture + Voice off"
              detail="Puppeteer film votre site section par section. ElevenLabs synthétise, vous appuyez sur Calibrer, la timeline s'aligne au mot près."
            />
            <StepRow
              n="05"
              title="Compose"
              detail="Remotion assemble dans un Mac chrome ou un iPhone frame, applique le preset choisi, écrit final.mp4. Prêt à publier."
            />
          </ol>

          <div className="mt-12 sm:mt-16">
            <Link
              href={studioHref}
              className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              {studioLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stack — text-only badges, pas d'icônes */}
      <section className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6">
              Stack
            </p>
            <h2 className="text-3xl sm:text-4xl font-medium leading-tight tracking-[-0.02em] text-zinc-950">
              Open source from top to bottom.
            </h2>
          </div>
          <div className="lg:col-span-8 self-end">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-zinc-700">
              {[
                "Remotion 4",
                "Next.js 16",
                "Puppeteer",
                "FFmpeg",
                "ElevenLabs",
                "Voicebox",
                "Tailwind v4",
                "Framer Motion",
              ].map((tech, i, arr) => (
                <li key={tech} className="flex items-center gap-5">
                  <span>{tech}</span>
                  {i < arr.length - 1 && (
                    <span className="text-zinc-300">·</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-zinc-500 leading-relaxed max-w-xl">
              ElevenLabs est l&apos;unique service externe optionnel — Voicebox
              couvre le cas 100 % local. Le reste du pipeline (capture,
              analyse audio, compose, rendu) tourne sans réseau une fois les
              dépendances installées.
            </p>
          </div>
        </div>
      </section>

      {/* Footer édito */}
      <footer className="bg-zinc-950 text-zinc-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-5">
              Studio digital
            </p>
            <h3 className="text-3xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.025em] text-white mb-6">
              GEN MOTION est un produit
              <br />
              <a
                href="https://www.smoothandesign.fr"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-[8px] decoration-zinc-700 hover:decoration-white transition-colors"
              >
                Smooth &amp; Design
              </a>
              , à Nice.
            </h3>
            <p className="text-zinc-400 max-w-md leading-relaxed">
              On code vos idées, vous changez le monde. GEN MOTION fait
              partie du WebGen ecosystem — d&apos;autres outils internes
              arrivent.
            </p>
          </div>
          <div className="lg:col-span-5 lg:pl-10 lg:border-l lg:border-zinc-800">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <FooterLink href={studioHref}>{isWeb ? "Télécharger" : "Studio"}</FooterLink>
              <FooterLink href="/about">À propos</FooterLink>
              <FooterLink href="/help">Documentation</FooterLink>
              <FooterLink href="/setup">Setup</FooterLink>
              <FooterLink href="/tour/webgen-motion-pitch">Tour démo</FooterLink>
              <FooterLink
                href="https://github.com/ben-ndui/webgen-motion"
                external
              >
                GitHub
              </FooterLink>
              <FooterLink href="https://www.smoothandesign.fr" external>
                smoothandesign.fr
              </FooterLink>
            </ul>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-zinc-500">
              <li><FooterLink href="/mentions-legales">Mentions légales</FooterLink></li>
              <li><FooterLink href="/confidentialite">Confidentialité</FooterLink></li>
              <li><FooterLink href="/cgu">CGU</FooterLink></li>
              <li><FooterLink href="/cgv">CGV</FooterLink></li>
            </ul>
            <p className="mt-8 text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-600">
              Open-core MIT · 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-zinc-800 leading-snug">{value}</dd>
    </div>
  );
}

function Pillar({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-4 sm:gap-8">
      <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 pt-2 sm:pt-3">
        {n}
      </span>
      <div>
        <h3 className="text-2xl sm:text-3xl font-medium leading-tight tracking-[-0.02em] text-zinc-950 mb-3">
          {title}
        </h3>
        <p className="text-zinc-600 leading-relaxed max-w-2xl">{body}</p>
      </div>
    </div>
  );
}

function StepRow({
  n,
  title,
  detail,
  cmd,
}: {
  n: string;
  title: string;
  detail?: string;
  cmd?: string;
}) {
  return (
    <li className="grid grid-cols-1 sm:grid-cols-[80px_220px_1fr] gap-3 sm:gap-8 py-6 sm:py-8 items-start">
      <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 pt-1">
        {n}
      </span>
      <p className="text-base sm:text-lg font-medium text-zinc-950">{title}</p>
      <div className="text-sm text-zinc-600 leading-relaxed">
        {cmd && (
          <code className="font-mono text-xs sm:text-sm bg-zinc-950 text-zinc-100 px-2 py-1 inline-block">
            {cmd}
          </code>
        )}
        {detail && <p>{detail}</p>}
      </div>
    </li>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const className =
    "text-zinc-300 hover:text-white transition-colors inline-flex items-center gap-1.5";
  if (external) {
    return (
      <li>
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {children}
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={className}>
        {children}
      </Link>
    </li>
  );
}
