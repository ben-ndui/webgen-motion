import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clapperboard,
  Code2,
  ExternalLink,
  FileText,
  Film,
  FolderTree,
  HelpCircle,
  Layers,
  MicVocal,
  Mouse,
  Music,
  Settings,
  Smartphone,
  Sparkles,
  Target,
  Video,
} from "lucide-react";

/**
 * Aide / Help page. Mirrors `docs/your-first-tour.md` in a visual,
 * scannable format. Goal: someone landing here for the first time
 * understands the mental model and the 5-step workflow in <3 minutes.
 */
export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky top bar — same shape as the hub */}
      <header className="sticky top-0 z-50 bg-surface border-b border-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="shrink-0 flex items-center gap-2 group"
              >
                <span className="w-7 h-7 rounded-lg bg-ink text-bg grid place-items-center group-hover:opacity-90 transition-colors">
                  <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className="font-semibold text-sm tracking-tight">
                  GEN MOTION
                </span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-faint" />
              <span className="text-sm text-muted font-medium">Aide</span>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au hub
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl xl:max-w-6xl mx-auto w-full px-6 lg:px-8 py-10 space-y-10">
        {/* Hero */}
        <section className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 text-ink-soft text-[10px] font-mono uppercase tracking-[0.2em]">
            <HelpCircle className="w-3 h-3" />
            Documentation
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Comment fonctionne GEN MOTION
          </h1>
          <p className="text-base text-muted leading-relaxed max-w-2xl">
            GEN MOTION film ton site/app et le transforme en vidéo motion
            design — capture E2E + voix off ElevenLabs + compose final, le
            tout 100% local. Ce guide te fait passer du clone à ta première
            vidéo en ~5 minutes.
          </p>
        </section>

        {/* Mental model */}
        <Section
          icon={Target}
          eyebrow="Concept"
          title="Le mental model"
        >
          <p className="text-sm text-ink-soft leading-relaxed">
            Un <strong>tour</strong> = un fichier JSON qui scénarise ce que
            GEN MOTION doit filmer. L'outil est totalement{" "}
            <strong>agnostique au projet</strong> : il n'y a pas de
            "liaison" formelle entre un projet et GEN MOTION. Le seul
            lien c'est le champ <Code>baseUrl</Code> du tour : Puppeteer va
            ouvrir cette URL dans Chromium et exécuter les steps en
            séquence (sections, overlays, clicks, scrolls…).
          </p>
        </Section>

        {/* 5-step workflow */}
        <Section
          icon={Clapperboard}
          eyebrow="Workflow"
          title="5 étapes pour ta première vidéo"
        >
          <ol className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Step
              num={1}
              icon={Settings}
              title="Configurer ElevenLabs (1 fois)"
            >
              Hub → bouton <strong>Setup</strong> en haut à droite → colle
              ton API key + Voice ID. Stocké dans{" "}
              <Code>~/.webgen-motion/config.json</Code>. Survit aux reboots,
              partagé entre tous tes tours.
            </Step>
            <Step
              num={2}
              icon={Sparkles}
              title="Créer un tour"
            >
              Hub → bouton <strong>Nouveau tour</strong> → nom + id auto-slug
              + format (16:9 desktop, 9:16 mobile). Le fichier{" "}
              <Code>tours/&lt;id&gt;.json</Code> est créé et tu atterris dans
              l'éditeur.
            </Step>
            <Step
              num={3}
              icon={Code2}
              title="Lier ton projet via baseUrl"
            >
              Dans le tab <strong>Script</strong>, édite le tour JSON pour
              renseigner <Code>baseUrl</Code> (ex :{" "}
              <Code>https://acme.com</Code>), <Code>brand</Code> (displayName
              / domain / tagline pour l'intro/outro du compose), et
              optionnellement <Code>voiceId</Code> pour une voix clonée
              spécifique à ce projet.
            </Step>
            <Step
              num={4}
              icon={Layers}
              title="Définir les étapes (sections, overlays, clicks…)"
            >
              Ajoute des steps dans la liste : sections colorées, overlays
              texte, scrolls, clicks (avec sélecteurs CSS du site cible).
              Chaque step peut porter un texte de voix off.
            </Step>
            <Step
              num={5}
              icon={Video}
              title="Capture → Voice off → Compose"
            >
              Lance les 3 actions dans l'ordre dans leurs tabs respectifs.
              Le clip final atterrit dans{" "}
              <Code>~/.webgen-motion/tours/&lt;id&gt;/final.mp4</Code>.
            </Step>
          </ol>
        </Section>

        {/* Mobile natif */}
        <Section
          icon={Smartphone}
          eyebrow="Mobile natif"
          title="Filmer une app iOS / Android"
          id="mobile"
        >
          <p className="text-sm text-muted leading-relaxed mb-4">
            Pour une app <strong>native</strong> (pas une web app), GEN MOTION
            pilote ton app avec <strong>Maestro</strong> et enregistre l&apos;écran :
            simulateur iOS (via <Code>simctl</Code>) ou device/émulateur Android
            (via <Code>adb</Code>). L&apos;app détecte ces outils — bannière dans
            l&apos;onglet Capture + pastille « device connecté » dans le hub.
          </p>

          <h3 className="text-sm font-semibold text-ink mb-2">Prérequis</h3>
          <ul className="text-sm text-muted leading-relaxed space-y-1.5 mb-4 list-disc pl-5">
            <li>
              <strong>Maestro</strong> + un <strong>JDK</strong> (Maestro tourne
              sur la JVM) :{" "}
              <Code>brew install mobile-dev-inc/tap/maestro</Code>
            </li>
            <li>
              <strong>iOS</strong> : Xcode + un <strong>Simulateur booté</strong>{" "}
              (macOS uniquement)
            </li>
            <li>
              <strong>Android</strong> : <Code>adb</Code> (Android platform-tools)
              + un <strong>device USB</strong> (le plus simple) ou un émulateur
            </li>
          </ul>

          <h3 className="text-sm font-semibold text-ink mb-2">
            Créer un tour mobile
          </h3>
          <p className="text-sm text-muted leading-relaxed mb-4">
            <strong>Nouveau tour</strong> → Plateforme <strong>iOS</strong> ou{" "}
            <strong>Android</strong> → renseigne le <strong>bundle id</strong>{" "}
            (iOS, ex <Code>com.entreprise.app</Code>) ou le{" "}
            <strong>package</strong> (Android). Le tour utilise alors les step
            types mobiles : <Code>launchApp</Code>, <Code>tapOn</Code>,{" "}
            <Code>inputText</Code>, <Code>swipe</Code>, <Code>back</Code> (+{" "}
            <Code>section</Code> / <Code>overlay</Code> / <Code>wait</Code>).
          </p>

          <pre className="rounded-xl bg-ink text-bg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`{
  "id": "mon-app-ios",
  "name": "Mon App · Onboarding",
  "platform": "ios",                       // ← "ios" ou "android"
  "appId": "com.entreprise.app",           // bundle id / package
  "format": "9:16",
  "steps": [
    { "type": "launchApp", "appId": "com.entreprise.app" },
    { "type": "section", "title": "Accueil", "dwellMs": 2500 },
    { "type": "tapOn", "text": "Se connecter" },   // texte OU accessibility id
    { "type": "inputText", "text": "demo@app.com" },
    { "type": "swipe", "direction": "up", "dwellMs": 1200 },
    { "type": "overlay", "text": "Tout en un geste", "dwellMs": 3000 },
    { "type": "back" }
  ]
}`}
          </pre>
          <p className="text-xs text-muted leading-relaxed mt-2">
            ⚠️ Les cibles de <Code>tapOn</Code> (<Code>text</Code> ou{" "}
            <Code>id</Code>) doivent matcher ce qui est réellement visible /
            accessible dans ton app. Lance la capture une fois pour ajuster.
          </p>
        </Section>

        {/* Tour schema */}
        <Section
          icon={FileText}
          eyebrow="Schéma"
          title="Anatomie d'un tour JSON"
        >
          <pre className="rounded-xl bg-ink text-bg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`{
  "id": "acme-landing",
  "name": "Acme · Landing",
  "description": "Tour rapide de la landing.",
  "estimatedSec": 30,
  "startPath": "/",
  "baseUrl": "https://acme.com",          // ← LE LIEN avec ton projet
  "format": "16:9",
  "brand": {
    "displayName": "Acme",
    "domain": "acme.com",
    "tagline": "by Smooth & Design"
  },
  "voiceId": "<voix-clonée-acme>",        // override la config globale
  "steps": [
    {
      "type": "section",
      "categoryId": "branding",
      "title": "Acme",
      "subtitle": "Le SaaS qui simplifie tout",
      "voiceover": "Bienvenue chez Acme.",
      "dwellMs": 2500
    },
    { "type": "wait", "dwellMs": 1500 },
    {
      "type": "overlay",
      "text": "Notre promesse",
      "position": "center",
      "dwellMs": 2800
    },
    {
      "type": "click",
      "selector": "[data-testid='cta-signup']",
      "dwellMs": 2500,
      "voiceover": "Inscris-toi en un clic."
    },
    { "type": "scroll", "to": 800, "dwellMs": 1800 }
  ]
}`}
          </pre>
          <p className="text-xs text-muted mt-3">
            Schéma complet :{" "}
            <Code>src/lib/types/tour.ts</Code>. Types de step disponibles :
            section, goto, click, type, select, hover, scroll, wait,
            overlay, keypress.
          </p>
        </Section>

        {/* CSS selectors */}
        <Section
          icon={Mouse}
          eyebrow="Astuce"
          title="Trouver les sélecteurs CSS pour les clicks"
        >
          <ol className="text-sm text-ink-soft leading-relaxed space-y-1.5 list-decimal pl-5">
            <li>Ouvre ton site dans Chrome</li>
            <li>
              <Code>⌘⌥I</Code> (Mac) ou <Code>F12</Code> → DevTools
            </li>
            <li>Clique l'icône inspect en haut-gauche</li>
            <li>Survole l'élément à cliquer → clique dessus</li>
            <li>
              Clic droit sur la balise dans l'arbre DOM →{" "}
              <strong>Copy → Copy selector</strong>
            </li>
          </ol>
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Préfère les sélecteurs stables</strong> :{" "}
              <Code>[data-testid="…"]</Code>, <Code>[data-tab="…"]</Code>,{" "}
              <Code>#hero h1</Code> tiennent face aux refactors CSS. Évite{" "}
              <Code>.css-1a2b3c4</Code> (auto-générés, fragiles). Si tu
              codes le site, ajoute des <Code>data-*</Code> sur les
              éléments clés du tour.
            </p>
          </div>
        </Section>

        {/* Voice modes */}
        <Section
          icon={MicVocal}
          eyebrow="Voix off"
          title="Per-step vs Narrative continu"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModeCard
              title="Per-step"
              tag="Défaut"
              desc="Une ligne de voix off par step. Le runner padding chaque clip avec du silence pour matcher le dwellMs de son step. Simple et prévisible."
            />
            <ModeCard
              title="Narrative continu"
              tag="Avancé"
              desc={
                <>
                  Un texte narratif unique avec des markers{" "}
                  <Code>[step:N]</Code>. ElevenLabs renvoie l'alignment
                  char-level ; le bouton <strong>Calibrer la timeline</strong>{" "}
                  recompute les dwellMs pour matcher le pacing réel. Re-capture
                  ensuite → mix parfaitement sync.
                </>
              }
            />
          </div>
        </Section>

        {/* Multi-projects */}
        <Section
          icon={Layers}
          eyebrow="Échelle"
          title="Plusieurs projets en parallèle"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModeCard
              title="Pattern A — 1 install, N tours"
              tag="≤ 10 projets"
              desc={
                <>
                  Un seul <Code>~/.webgen-motion/config.json</Code> global
                  (API key partagée). Chaque tour a son override{" "}
                  <Code>voiceId</Code> + <Code>brand</Code> +{" "}
                  <Code>baseUrl</Code>. Mainenance facile.
                </>
              }
            />
            <ModeCard
              title="Pattern B — 1 install par projet"
              tag="Isolation"
              desc={
                <>
                  <Code>npx create-webgen-motion &lt;projet&gt;</Code> par
                  projet. Plus lourd à maintenir mais isolation totale :
                  config, tours, captures, voiceovers séparés.
                </>
              }
            />
          </div>
        </Section>

        {/* Storage layout */}
        <Section
          icon={FolderTree}
          eyebrow="Stockage"
          title="Où vont mes fichiers"
        >
          <pre className="rounded-xl bg-ink text-bg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`~/.webgen-motion/
├── config.json                 # Setup wizard (creds ElevenLabs)
├── audio/                      # Library musique de fond
│   ├── index.json
│   └── <slug>-<epoch>.mp3
├── vo-cache/                   # TTS cache (par voix + texte)
│   ├── <sha1>.mp3
│   └── <sha1>.alignment.json
└── tours/
    └── <tourId>/
        ├── manifest.json
        ├── section-NN-<cat>.mp4
        ├── voiceover.mp3
        ├── voiceover-alignment.json
        └── final.mp4`}
          </pre>
          <p className="text-xs text-muted mt-3">
            Tout reste sur ta machine. Survit aux reboots. Jamais commit
            dans git.
          </p>
        </Section>

        {/* FAQ */}
        <Section
          icon={HelpCircle}
          eyebrow="FAQ"
          title="Questions fréquentes"
        >
          <Faq q="Je peux filmer un site en localhost ?">
            Oui. <Code>baseUrl: "http://localhost:3000"</Code> marche tant que
            ton site tourne pendant la capture.
          </Faq>
          <Faq q="Ça marche sur une app qui demande un login ?">
            Pas encore en standard. Tu peux mettre <Code>auth: "admin"</Code>{" "}
            sur le tour et plumber manuellement un cookie de session (à
            venir).
          </Faq>
          <Faq q="La voix off est en décalage avec les overlays ?">
            Bascule sur le mode <strong>narrative continu</strong> et utilise{" "}
            <strong>Calibrer la timeline</strong>, ça aligne au mot près.
          </Faq>
          <Faq q="Comment je supprime un tour ?">
            Supprime le fichier <Code>tours/&lt;id&gt;.json</Code>. Pour
            aussi nettoyer les captures :{" "}
            <Code>rm -rf ~/.webgen-motion/tours/&lt;id&gt;/</Code>.
          </Faq>
          <Faq q="Mon site change beaucoup, les sélecteurs CSS cassent.">
            Ajoute des <Code>data-testid="…"</Code> ou{" "}
            <Code>data-tab="…"</Code> sur les éléments clés du tour. Stables
            face aux refactors CSS.
          </Faq>
        </Section>

        {/* Footer link to full markdown */}
        <section className="rounded-2xl border border-line bg-bg-sunken p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-ink-soft" />
            <p className="text-sm text-ink-soft">
              Guide complet au format markdown (versionné dans le repo)
            </p>
          </div>
          <a
            href="https://github.com/ben-ndui/webgen-motion/blob/main/docs/your-first-tour.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-xs font-medium hover:opacity-90 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            docs/your-first-tour.md
          </a>
        </section>

        {/* Back to hub CTA */}
        <div className="flex justify-center pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-2 text-ink-soft text-sm font-medium hover:bg-surface-2 transition-colors"
          >
            Retour au hub
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-12 flex items-center justify-between text-xs text-muted">
          <p>
            <span className="font-medium text-ink-soft">GEN MOTION</span>{" "}
            · Smooth &amp; Design · local-first
          </p>
        </div>
      </footer>
    </div>
  );
}

function Section({
  icon: Icon,
  eyebrow,
  title,
  id,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-ink text-bg grid place-items-center">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
            {eyebrow}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Step({
  num,
  icon: Icon,
  title,
  children,
}: {
  num: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4 flex gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-2 grid place-items-center font-mono text-sm font-semibold text-ink">
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-0.5">
          <Icon className="w-3.5 h-3.5 text-muted" />
          {title}
        </div>
        <p className="text-sm text-muted leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function ModeCard({
  title,
  tag,
  desc,
}: {
  title: string;
  tag: string;
  desc: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-muted">
          {tag}
        </span>
      </div>
      <p className="text-xs text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-surface p-4 mb-2 last:mb-0">
      <summary className="cursor-pointer text-sm font-medium text-ink list-none flex items-center justify-between gap-2">
        <span>{q}</span>
        <ChevronRight className="w-4 h-4 text-faint transition-transform group-open:rotate-90" />
      </summary>
      <p className="text-sm text-muted mt-2 leading-relaxed">{children}</p>
    </details>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-surface-2 text-ink-soft font-mono text-[0.85em]">
      {children}
    </code>
  );
}
