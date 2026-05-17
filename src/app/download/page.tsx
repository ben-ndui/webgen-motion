import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import BuyButton from "../_components/buy-button";

/**
 * Page /download — landing pour visiteurs de la vitrine Vercel qui
 * cherchent à récupérer l'app desktop. Reprend la DA noir & blanc
 * stricte de la landing root. Pas de bouton "Lancer le studio" ici
 * (les routes dashboard/tour/setup nécessitent le filesystem local).
 *
 * URL des releases : https://github.com/ben-ndui/webgen-motion/releases
 * → redirect vers le tag publié le plus récent (depuis v0.2.0).
 */
export default function DownloadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950">
      {/* Top bar */}
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
                href="/"
                className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </Link>
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
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-20 sm:pt-28 pb-16 sm:pb-24">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8">
            Téléchargement · v0.2.0 · local-first
          </p>
          <h1 className="text-[44px] sm:text-[72px] font-medium leading-[0.95] tracking-[-0.04em] text-zinc-950 mb-8">
            Récupérez GEN MOTION
            <br />
            <span className="text-zinc-400">sur votre machine.</span>
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-zinc-700 leading-relaxed mb-10">
            GEN MOTION est un outil <strong className="text-zinc-950 font-medium">local-first</strong> :
            la capture Puppeteer, la synthèse vocale, le compose Remotion et
            le rendu final tournent sur votre machine. Aucun cloud, aucun
            compte requis. La vitrine que vous consultez sert juste à
            présenter l&apos;outil — les routes Studio / Dashboard ne
            fonctionnent que dans l&apos;app installée.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/ben-ndui/webgen-motion/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Télécharger gratuit (.dmg)
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <BuyButton variant="secondary" />
            <a
              href="https://github.com/ben-ndui/webgen-motion/releases"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
            >
              Toutes les versions
            </a>
          </div>

          <p className="mt-6 text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500">
            Community gratuit · Studio Edition $49 one-time · Apple notarized + stapled
          </p>
        </div>
      </section>

      {/* Plates-formes */}
      <section className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16 sm:py-20">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8">
            Plates-formes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            <PlatformRow
              os="macOS"
              status="ready"
              detail="Apple Silicon (arm64). Intel (x86_64) à venir via CI multi-OS dès la prochaine release."
            />
            <PlatformRow
              os="Windows"
              status="soon"
              detail="Installer .msi produit par la matrix CI au prochain tag. Signature Authenticode à brancher."
            />
            <PlatformRow
              os="Linux"
              status="soon"
              detail=".AppImage + .deb produits par la matrix CI au prochain tag. Pas de signature requise."
            />
          </div>
        </div>
      </section>

      {/* Setup */}
      <section className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16 sm:py-20">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8">
            Après installation
          </p>
          <ol className="space-y-6 sm:space-y-7">
            <SetupStep
              n="01"
              title="Ouvrez l'app"
              detail="Double-cliquez le .dmg téléchargé, glissez GEN MOTION dans Applications, lancez-la. macOS valide la signature Apple notarized — aucun pop-up Gatekeeper bloquant."
            />
            <SetupStep
              n="02"
              title="Suivez le wizard de setup"
              detail="Au premier lancement, l'app vous guide pour configurer ElevenLabs (voix off cloud, optionnel) ou Voicebox (voix off 100% local). Une clé API ElevenLabs prend 2 minutes à créer."
            />
            <SetupStep
              n="03"
              title="Créez votre premier tour"
              detail="Depuis le dashboard, cliquez Nouveau tour, entrez l'URL de votre site, laissez l'Agent IA générer le script ou éditez manuellement. Capture + compose tournent en quelques minutes."
            />
          </ol>
          <p className="mt-10 text-sm text-zinc-500">
            Documentation détaillée + screenshots dans la{" "}
            <Link
              href="/help"
              className="text-zinc-950 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
            >
              page Doc
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-300">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3">
              Open source · MIT
            </p>
            <p className="text-zinc-400 leading-relaxed max-w-md">
              Le code source est sur{" "}
              <a
                href="https://github.com/ben-ndui/webgen-motion"
                target="_blank"
                rel="noreferrer"
                className="text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-white transition-colors"
              >
                github.com/ben-ndui/webgen-motion
              </a>
              . Issues, PRs et forks bienvenus.
            </p>
          </div>
          <div className="lg:text-right">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3">
              Studio digital
            </p>
            <p className="text-zinc-400">
              Un produit{" "}
              <a
                href="https://www.smoothandesign.fr"
                target="_blank"
                rel="noreferrer"
                className="text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-white transition-colors"
              >
                Smooth &amp; Design
              </a>
              , à Nice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlatformRow({
  os,
  status,
  detail,
}: {
  os: string;
  status: "ready" | "soon";
  detail: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-xl font-medium tracking-tight text-zinc-950">
          {os}
        </h3>
        {status === "ready" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
            Disponible
          </span>
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">
            Bientôt
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-600 leading-relaxed">{detail}</p>
    </div>
  );
}

function SetupStep({
  n,
  title,
  detail,
}: {
  n: string;
  title: string;
  detail: string;
}) {
  return (
    <li className="grid grid-cols-12 gap-4 sm:gap-6 border-b border-zinc-100 pb-6 last:border-b-0">
      <div className="col-span-2 sm:col-span-1 text-[11px] font-mono text-zinc-400 pt-1">
        {n}
      </div>
      <div className="col-span-10 sm:col-span-11">
        <h4 className="text-base sm:text-lg font-medium text-zinc-950 mb-2">
          {title}
        </h4>
        <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed">
          {detail}
        </p>
      </div>
    </li>
  );
}
