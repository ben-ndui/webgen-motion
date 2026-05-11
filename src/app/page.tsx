import Link from "next/link";
import {
  ArrowRight,
  Box,
  Cpu,
  ExternalLink,
  Film,
  Headphones,
  HelpCircle,
  Layers,
  Mic,
  Palette,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";

/**
 * Landing page. First surface a user sees after `npx create-webgen-motion`
 * — the marketing pitch BEFORE the dashboard. Dark hero, spacious
 * sections, animated accents. The dashboard lives at `/dashboard`.
 *
 * Structure :
 *  1. Sticky top bar (logo / Dashboard / Help / GitHub)
 *  2. Hero — gradient backdrop + big title + tagline + 2 CTAs
 *  3. Demo video block (placeholder until the meta-démo MP4 is hosted)
 *  4. 3 Pillars — Local-first / 5-tab workflow / 4 style presets
 *  5. 5-step quickstart with icons
 *  6. Stack pills
 *  7. Footer with credits + CTA
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Sticky top bar — dark variant */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-7 h-7 rounded-lg bg-white text-slate-900 grid place-items-center group-hover:bg-slate-100 transition-colors">
                <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
              <span className="font-semibold text-sm tracking-tight">
                webgen-motion
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/help"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Aide
              </Link>
              <a
                href="https://github.com/ben-ndui/webgen-motion"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GitHub
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Lancer le studio
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated gradient blobs */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, #2563eb 0%, transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute top-40 right-0 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, #ec4899 0%, transparent 60%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-300">
              Motion Studio · Local-first · v0.2
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl xl:text-8xl font-bold tracking-tight leading-[0.95] mb-6">
            Du site web
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
              à la vidéo motion
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Capture · Mixe · Compose. Le Motion Studio qui transforme
            n&apos;importe quel site en clip motion design en cinq minutes —
            sur ta machine, sans cloud, ta voix clonée.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors shadow-lg shadow-blue-500/20"
            >
              Lancer le studio
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Lire la doc
            </Link>
          </div>

          <p className="mt-8 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">
            Open source · MIT · par Smooth &amp; Design
          </p>
        </div>
      </section>

      {/* Demo video — rendered via the pipeline itself (Capture +
       *  Voice off + Calibrate + Compose). Source tour lives at
       *  tours/webgen-motion-pitch.json. Generated 80s clip is
       *  served at /demo.mp4 (public/) so the landing stays
       *  self-contained — no external host. */}
      <section className="px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl shadow-blue-500/10">
            <video
              src="/demo.mp4"
              controls
              playsInline
              preload="metadata"
              className="w-full h-full block"
            />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-400">
            <p>
              <span className="font-mono uppercase tracking-[0.2em] text-slate-500">
                Demo
              </span>{" "}
              · 100s · Style Energetic · narrative ElevenLabs · rendu par
              Remotion
            </p>
            <Link
              href="/tour/webgen-motion-pitch"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              Voir le tour source
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Pillars */}
      <section className="bg-white text-slate-900 px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
              Pourquoi webgen-motion ?
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-tight">
              Un Motion Studio,
              <br />
              taillé pour les devs.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Pillar
              icon={Cpu}
              title="Local-first"
              tagline="Aucun cloud"
              body="Capture Puppeteer + Voicebox + Remotion tournent sur ta machine. Tes vidéos restent chez toi. Pas de vendor lock-in, pas de quota."
            />
            <Pillar
              icon={Layers}
              title="5 onglets, 1 timeline"
              tagline="Workflow data-driven"
              body="Script · Capture · Audio · Voix off · Compose. Édite tes tours via UI ou JSON, sauvegarde toujours visible, rien à ré-écrire."
            />
            <Pillar
              icon={Palette}
              title="4 style presets"
              tagline="Sober · Energetic · Cinematic · Glitch"
              body="La même capture, 4 montages visuellement très différents. Switch en 1 clic dans le tab Compose."
            />
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section className="bg-slate-50 text-slate-900 px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
              Du clone à ton premier clip
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Cinq étapes · cinq minutes.
            </h2>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <Step n={1} icon={Box} title="Scaffold" body="npx create-webgen-motion my-promo" mono />
            <Step n={2} icon={Mic} title="Setup voix off" body="ElevenLabs cloud ou Voicebox 100% local — wizard guidé" />
            <Step n={3} icon={Sparkles} title="Nouveau tour" body="Bouton dashboard · slug + format + brand pré-rempli" />
            <Step n={4} icon={Video} title="Capture + Voice off" body="Puppeteer film ton site · ElevenLabs aligne la voix au caractère près" />
            <Step n={5} icon={Wand2} title="Compose" body="Remotion + 4 styles · final.mp4 à la sortie" />
          </ol>

          <div className="mt-12 sm:mt-16 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Lancer le studio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="bg-slate-900 text-white px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
            Stack
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Open source from top to bottom.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Aucun service propriétaire dans le pipeline de génération.
            ElevenLabs reste optionnel (Voicebox local couvre le 100% offline).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              "Remotion",
              "Next.js 16",
              "Puppeteer",
              "FFmpeg",
              "ElevenLabs",
              "Voicebox",
              "Tailwind v4",
              "Framer Motion",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3 text-xs">
          <p className="text-slate-500">
            <span className="font-medium text-slate-300">webgen-motion</span> ·
            Made with{" "}
            <Headphones className="w-3 h-3 inline-block align-text-bottom text-fuchsia-400" />{" "}
            in Nice by{" "}
            <a
              href="https://www.smoothandesign.fr"
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 hover:text-white underline underline-offset-2"
            >
              Smooth &amp; Design
            </a>
          </p>
          <div className="flex items-center gap-3 text-slate-500">
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <span className="text-slate-700">·</span>
            <Link href="/help" className="hover:text-white">
              Docs
            </Link>
            <span className="text-slate-700">·</span>
            <a
              href="https://github.com/ben-ndui/webgen-motion"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Pillar({
  icon: Icon,
  title,
  tagline,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tagline: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="w-11 h-11 rounded-xl bg-slate-900 text-white grid place-items-center mb-5">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5">
        {tagline}
      </p>
      <h3 className="text-xl font-semibold text-slate-900 mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  body,
  mono,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  mono?: boolean;
}) {
  return (
    <li className="relative rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3 mb-2">
        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-900 grid place-items-center font-mono text-xs font-semibold flex-shrink-0">
          {n}
        </span>
        <Icon className="w-4 h-4 text-slate-500 mt-1.5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1.5 tracking-tight">
        {title}
      </h3>
      <p
        className={`text-xs leading-relaxed text-slate-600 ${
          mono ? "font-mono" : ""
        }`}
      >
        {body}
      </p>
    </li>
  );
}
