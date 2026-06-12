# CLAUDE.md — GEN MOTION

> Guide pour agents IA (Claude Code, Cursor, Copilot, etc.) qui
> installent / configurent / itèrent sur GEN MOTION.
>
> **Repo slug** : `webgen-motion` (préservé pour rétro-compat git/npm).
> **Brand UI + domain** : `GEN MOTION` / `genmotion.app`.

## TL;DR pour un agent

1. `cd ~/IdeaProjects && git clone https://github.com/ben-ndui/webgen-motion.git && cd webgen-motion`
2. `brew install ffmpeg` (macOS) ou équivalent système
3. `npm install` (puppeteer télécharge Chromium au passage)
4. Créer `.env.local` avec `ELEVENLABS_API_KEY=sk_...` et `ELEVENLABS_VOICE_ID=<id>` si voix off requise. Pour le checkout Stripe local : `STRIPE_SECRET_KEY=sk_test_...` + `STRIPE_PRICE_ID=price_...` + `STRIPE_WEBHOOK_SECRET=whsec_...` + `WEBGEN_MOTION_DISCORD_WEBHOOK=<url>`.
5. `npm run dev` → ouvre http://localhost:3000
6. Tester un tour bundlé : `/dashboard` → click un tour → tab Capture → Capturer → tab Compose → Composer

Pas de cloud requis pour le pipeline core. Outputs dans `~/.webgen-motion/`.

---

## Ce que c'est

**GEN MOTION** est un outil **desktop installable** de génération de vidéos motion design pour des sites / apps web. Il fait :

1. **Capture E2E** : Puppeteer film un site cible section par section, avec splash cards animés et overlays motion design
2. **Voice-over** : ElevenLabs TTS (voix clonée) avec cache disk + pronunciation map, ou Voicebox local 100% offline
3. **Background music** : library MP3/WAV upload via UI, mix avec sidechain ducking sur la voix off
4. **Compose final** : Remotion assemble dans Mac browser chrome (16:9) ou iPhone frame (9:16), avec 4 style presets (Sober / Energetic / Cinematic / Glitch) + 5 transitions par catégorie + Ken Burns + BeatsLayer audio-réactif + (Studio Edition) frames 3D iPhone/MacBook
5. **Tout en local** : aucun cloud requis pour le pipeline. Vitrine `genmotion.app` (Next.js sur Vercel) sert juste de marketing + checkout Stripe.

C'est un produit **Smooth & Design** sous modèle open-core MIT :
- **Community Edition** gratuite (pipeline complet, presets Sober + Energetic, formats 16:9 + 9:16, Agent IA BYOK)
- **Studio Edition** $49 paiement unique perpétuel (frames 3D, presets Cinematic & Glitch, multi-format export, music library, watermark removal) — license `.license` Ed25519 signée, vérifiée offline
- **Enterprise** sur devis (white-label, API headless, SSO)

## Stack

- **Next.js 16** (App Router + Turbopack) — `node_modules/next/dist/docs/` pour la doc embedded
- **Tailwind v4** — design tokens light slate + brand noir & blanc strict (`globals.css`)
- **Geist Sans / Geist Mono** — fonts via `next/font`
- **lucide-react** — icons partout
- **framer-motion** — transitions phase loader / cards
- **Puppeteer** — runner E2E (capture headless)
- **FFmpeg** — encode des frames JPEG → MP4 + analyse audio (silencedetect + onset)
- **Remotion 4 + @remotion/three** — compositor final.mp4 frame-accurate (intro/outro + Ken Burns + 5 transitions par catégorie + 3D R3F Beta)
- **ElevenLabs** — TTS via REST API (`scripts/audio-tour.ts`) ou Voicebox local
- **Tauri 2** — coque desktop natif macOS / Windows / Linux (Rust shell + WebView, sidecars Node + ffmpeg + ffprobe bundlés)
- **Stripe** v22 — checkout one-time $49 Studio Edition (`/api/stripe/checkout` + `/api/stripe/webhook`)
- **Ed25519 (`node:crypto`)** — license offline-first signée + vérifiée localement

## Structure

```
webgen-motion/                   # slug repo (rétro-compat)
├── tours/                       # Catalogue tours JSON (data-driven)
│   ├── uzme-landing.json        # Demo public 16:9
│   ├── webgen-motion-pitch.json # Meta-démo : GEN MOTION filme GEN MOTION
│   └── notary-3d-test.json      # Test Sprint 7 frames 3D
├── scripts/
│   ├── capture-tour.ts          # E2E filmé section par section
│   ├── audio-tour.ts            # TTS + timeline audio (ElevenLabs / Voicebox)
│   ├── compose-tour.ts          # Compose runner — edit plan + spawn `remotion render`
│   ├── lib/edit-plan.ts         # Edit Engine — EDL : trims, beat snap, J-cuts, VO segments, subtitles
│   ├── analyze-audio.ts         # ffmpeg silencedetect + beats RMS
│   ├── agent-generate-tour.ts   # Agent IA Claude génère tour depuis URL
│   ├── notarize-and-staple.mjs  # Pipeline Apple Notary end-to-end
│   ├── generate-license-keypair.mjs  # Ed25519 keypair gen (Ben backoffice)
│   ├── issue-license.mjs        # Sign + write .license (Ben backoffice)
│   └── desktop-{prepare,fetch}-*.mjs # Tauri build helpers
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Landing slides carrousel 5 slides (Sprint 13)
│   │   ├── dashboard/page.tsx        # Hub tours (route app, ex-/)
│   │   ├── tour/[id]/                # Éditeur (5 tabs Script/Capture/Audio/Voice/Compose)
│   │   ├── compose/[id]/             # Live preview (audio playback synchro)
│   │   ├── about/page.tsx            # Présentation Smooth & Design (Sprint 11)
│   │   ├── download/page.tsx         # Page download macOS .dmg + buy Studio
│   │   ├── thanks/page.tsx           # After-Stripe success
│   │   ├── setup/                    # Wizard config + agent + models + license
│   │   ├── notary/                   # Dashboard Apple Notary submissions
│   │   ├── (legal)/                  # Pages légales FR : mentions/confidentialite/cgu/cgv
│   │   ├── icon.tsx + apple-icon.tsx # Favicons next/og
│   │   ├── opengraph-image.tsx       # OG share card 1200×630
│   │   ├── wordmark-studio.png/      # PNG route pour upload Stripe product image
│   │   ├── _components/              # BuyButton, SlidesCarousel, UpdateChecker
│   │   └── api/
│   │       ├── motion/               # Routes pipeline (capture/audio/compose/license/notary/models/...)
│   │       ├── stripe/{checkout,webhook}/  # Sprint 10
│   │       └── version/              # Sprint 12 update checker
│   └── lib/
│       ├── tour-loader.ts            # Lit tours/<id>.json (server-side fs)
│       ├── motion-tour-store.ts      # Path ~/.webgen-motion/tours/
│       ├── motion-audio-store.ts     # Audio library + ffprobe
│       ├── motion-categories.ts      # Palette par category
│       ├── pronunciation.ts          # Phonetic respelling
│       ├── brand.ts                  # Tokens transitionnels
│       ├── edition.ts                # resolveEdition() — env > license > community
│       ├── license/                  # Ed25519 verify offline-first (Sprint 9)
│       ├── stripe.ts                 # Stripe client + base URL (Sprint 10)
│       ├── legal/config.ts           # Single source publisher (Sprint 11)
│       ├── llm-providers/            # Anthropic Claude provider abstraction (Sprint 5)
│       └── types/tour.ts             # TourEntry / TourStep
├── remotion/                          # Compositions Remotion (Sprint 5 + 7)
│   ├── Root.tsx + Tour.tsx
│   ├── SectionPlayer.tsx + IPhoneFrame.tsx + MacChrome.tsx
│   ├── BeatsLayer.tsx + IntroOutro.tsx
│   ├── three/                         # Frames 3D R3F Beta : iPhone/MacBook procéduraux + GLBDevice + camera-presets
│   └── lib/{transitions,style-presets,types}.ts
├── src-tauri/                         # Coque desktop Tauri (Sprint Desktop)
│   ├── tauri.conf.json + Cargo.toml
│   ├── entitlements.plist (hardened runtime + JIT)
│   ├── runners/ + standalone/ + binaries/  # Gitignored build artifacts
│   └── icons/
├── .github/workflows/desktop-release.yml  # CI matrix 4 OS (Phase B fixed)
├── public/                            # Static assets (demo.mp4, wordmark.svg, ...)
├── webgen-motion.config.ts            # Edition + defaults (Sprint 6)
├── CHANGELOG.md                       # Détail commit + breaking changes
├── ROADMAP.md                         # Sprints + chantiers + décisions
└── README.md                          # Quickstart user + editions + features
```

## Concepts clés

### Tours = JSON data, pas TS hardcodé

Un tour est défini dans `tours/<id>.json` qui valide comme `TourEntry` (voir `src/lib/types/tour.ts`). Schéma :

```ts
{
  id: string;              // Si absent, fallback sur le filename
  name: string;
  description: string;
  estimatedSec: number;
  startPath: string;       // "/" (origin = baseUrl)
  baseUrl?: string;        // default "http://localhost:3000"
  format?: "16:9" | "9:16"; // default 16:9
  bgMusic?: string;        // optional path to default MP3
  steps: TourStep[];       // section / overlay / scroll / wait / click / type / select / hover / goto / keypress
}
```

Le hub (`src/app/page.tsx`) liste tous les tours via `getAllTours()` à chaque render.

### Storage

`~/.webgen-motion/` (hors repo, hors git) :

- `audio/` — MP3/WAV/M4A library + index.json
- `vo-cache/` — TTS cache keyed par sha1(voiceId|model|text)
- `tours/<id>/` — manifest.json + section MP4s + voiceover.mp3 + final.mp4

Survit aux reboots. Partagé entre tous les tours.

### Pipeline d'un tour

1. **Capture** : `POST /api/motion/tour/run` spawn `npx tsx scripts/capture-tour.ts` qui :
   - Plan les sections via les markers `{ type: "section", ... }`
   - Ouvre une fenêtre Chromium au format adapté (1920×1080 ou 1080×1920)
   - Pour chaque section : splash card + steps + encode MP4 ffmpeg
   - Écrit `manifest.json` + `section-NN-<cat>.mp4` dans `~/.webgen-motion/tours/<id>/`

2. **Voice off** (optionnel) : `POST /api/motion/tour/audio/voice/run` spawn `audio-tour.ts` qui :
   - Pour chaque step avec `voiceover` (ou override UI) → ElevenLabs TTS (avec pronunciation map)
   - Cache par sha1 du texte
   - Assemble une timeline MP3 alignée sur les durées des sections du manifest
   - Écrit `voiceover.mp3`

3. **Compose** : `POST /api/motion/tour/compose/run` spawn `compose-tour.ts` qui :
   - Charge le manifest + le tour (composeStyle + brand)
   - Spawn `analyze-audio.ts` (ffmpeg silencedetect sur VO + beats RMS sur bg music → `audio-analysis.json`)
   - **Edit Engine** (`scripts/lib/edit-plan.ts`) : transforme manifest + `voiceover-alignment.json` + analyse en **décisions de montage** → `edit-plan.json` : trim des temps morts (vidéo + voix sync), cuts snappés sur les beats, J-cuts (VO 250ms avant le visuel), crossfades adaptatifs par frontière, segments VO placés au timing vidéo réel (`stepTimings` du manifest), cues sous-titres karaoké (`tour.subtitles: true`). Flags : `--no-edit-plan` / `--no-edit-trim`.
   - Stage les MP4s + audios dans un `.remotion-public/` (Remotion sert via `staticFile()`)
   - Spawn `npx remotion render tour-{16x9|9x16} out/final.mp4 --props ...`
   - Composition Remotion (`remotion/Tour.tsx`) joue chaque section dans son device frame (Mac chrome / iPhone), applique le style preset (Ken Burns dirigé vers les hotspots + transitions + backdrop motion + beats layer + SubtitlesLayer), mixe VO segmentée + bg music via `<Audio>`

4. **Auto-load** : la page tour preview hit `/api/motion/tour/status?id=<id>` au mount → restaure capture/vo/compose `ready` si les fichiers existent.

### Tabs UX (Sprint 2)

`/tour/<id>` est un single page client component avec 5 tabs state-based (pattern WebGen) :

| Tab | Component | Rôle |
|---|---|---|
| Script | `script-tab.tsx` | Liste des steps + édition VO inline + format selector + stats |
| Capture | `capture-tab.tsx` | Bouton Capturer + sections grid + auto-load |
| Audio | `audio-tab.tsx` | MusicLibrary upload + sliders volumes |
| Voix off | `voice-tab.tsx` | Bouton Générer + counters + audio preview |
| Compose | `compose-tab.tsx` | Bouton Composer + readiness strip + final.mp4 player |

`TourClient.tsx` est l'orchestrator : tient le state (5 state machines) + handlers (3 NDJSON streamers) + un `consumeNdjson` réutilisable.

## Configuration (env vars)

```bash
# .env.local
ELEVENLABS_API_KEY=sk_...                 # https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_VOICE_ID=<voiceId>              # voix clonée OU voix stock
ELEVENLABS_MODEL=eleven_multilingual_v2    # optionnel
```

Sans ces clés :
- Capture marche
- Voice off échoue avec un message clair en UI
- Compose marche (mais sans voix off, juste avec la musique)

> **Sprint 3 en cours** : un Setup wizard remplace bientôt `.env.local` par une UI de config (config.json en `~/.webgen-motion/`).

## Commands

```bash
npm run dev          # dev server (Turbopack, hot reload)
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint

# CLI direct (debug, sans dashboard)
npx tsx scripts/capture-tour.ts --tour-id uzme-landing --base-url https://uzme.app --fps 30 --out ~/.webgen-motion/tours/uzme-landing
npx tsx scripts/audio-tour.ts --tour-id uzme-landing --tour-dir ~/.webgen-motion/tours/uzme-landing
npx tsx scripts/compose-tour.ts --tour-id uzme-landing --tour-dir ~/.webgen-motion/tours/uzme-landing
```

## Décisions architecturales

Voir `ROADMAP.md` section "Décisions enregistrées" pour le détail. TL;DR :

- **Local-first, pas SaaS** : Puppeteer + ffmpeg natifs sont 3-5× plus rapides qu'en CI, pas de vendor lock-in, conf du projet reste sur la machine du dev.
- **Tabs state-based** (pas route-based) : mirror du pattern WebGen `create-tab.tsx`, plus simple à orchestrer, l'éditeur visuel à venir bénéficie d'un seul orchestrateur.
- **Tours en JSON** : data-driven → utilisateur n'a pas besoin de TypeScript, débloque l'éditeur visuel.
- **`~/.webgen-motion/` pas `tmpdir()`** : `/tmp` wipé au reboot tuait l'historique. Maintenant persistant.

## Pitfalls

### Next 16 — params est une Promise

```tsx
// Server component
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}

// Client component
"use client";
import { use } from "react";
export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
}
```

### tour-loader = fs server-only

`src/lib/tour-loader.ts` utilise `node:fs`. Si tu l'importes dans un client component, le bundle Turbopack plante avec "Code generation for chunk item errored". Solution : fetch côté server (page.tsx server component) puis pass la donnée comme prop au client.

### Storage paths

Tous les chemins persistent passent par `src/lib/motion-tour-store.ts` (`getMotionToursBaseDir()` / `getMotionTourDir(id)`). Ne hardcode **jamais** `tmpdir()` ou un chemin uzme-specific.

### __name shim Puppeteer

`scripts/capture-tour.ts` injecte `window.__name = fn => fn` via `evaluateOnNewDocument` parce que tsx/esbuild wrap les fonctions inline avec un helper `__name` qui n'existe pas dans le browser. Si tu vois `__name is not defined` dans les logs page, c'est probablement un nouveau helper esbuild — étendre le shim.

### Brand tokens transitionnels

`src/lib/brand.ts` exporte `UZME` mappé sur slate palette. C'est un pont temporaire pour les composants migrés depuis uzme-support qui utilisent `UZME.primary` en inline style. Sprint 4 va les rip et passer en Tailwind classes pures.

## Pour aller plus loin

- `ROADMAP.md` — sprints, futures, décisions
- `README.md` — quickstart user-facing (Sprint 3 en cours d'enrichissement)
- `node_modules/next/dist/docs/01-app/` — Next 16 docs locales (cf. AGENTS.md)
