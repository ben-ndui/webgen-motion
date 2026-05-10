# CLAUDE.md — webgen-motion

> Guide pour agents IA (Claude Code, Cursor, Copilot, etc.) qui
> installent / configurent / itèrent sur webgen-motion.

## TL;DR pour un agent

1. `cd ~/IdeaProjects && git clone https://github.com/ben-ndui/webgen-motion.git && cd webgen-motion`
2. `brew install ffmpeg` (macOS) ou équivalent système
3. `npm install` (puppeteer télécharge Chromium au passage)
4. Créer `.env.local` avec `ELEVENLABS_API_KEY=sk_...` et `ELEVENLABS_VOICE_ID=<id>` si voix off requise
5. `npm run dev` → ouvre http://localhost:3000
6. Tester un tour bundlé : `/tour/uzme-landing` → tab Capture → bouton Capturer → tab Compose → bouton Composer

Pas de cloud, pas de SaaS, pas de DB. Tout local. Outputs dans `~/.webgen-motion/`.

---

## Ce que c'est

**webgen-motion** est un outil portable de génération de vidéos motion design pour des sites / apps web. Il fait :

1. **Capture E2E** : Puppeteer film un site cible section par section, avec splash cards animés et overlays motion design
2. **Voice-over** : ElevenLabs TTS (voix clonée) avec cache disk + pronunciation map
3. **Background music** : library MP3/WAV upload via UI, mix avec sidechain ducking sur la voix off
4. **Compose final** : re-films la timeline dans une animated Mac browser chrome (16:9) ou iPhone frame (9:16) avec backdrop coloré par catégorie
5. **Tout en local** : aucun cloud requis, aucun lock-in vendor

C'est un produit Smooth & Design pensé pour devenir un package portable cloneable.

## Stack

- **Next.js 16** (App Router + Turbopack) — `node_modules/next/dist/docs/` pour la doc embedded
- **Tailwind v4** — design tokens light slate (`globals.css`)
- **Geist Sans / Geist Mono** — fonts via `next/font`
- **lucide-react** — icons partout (sauf legacy react-icons dans le tour preview, en cours de migration)
- **framer-motion** — transitions phase loader / cards
- **Puppeteer** — runner E2E (capture + compose headless)
- **FFmpeg** — encode des frames JPEG → MP4
- **ElevenLabs** — TTS via REST API (`scripts/audio-tour.ts`)

## Structure

```
webgen-motion/
├── tours/                       # Catalogue de tours JSON (data-driven)
│   ├── uzme-landing.json        # Tour démo 16:9
│   └── uzme-landing-portrait.json
├── scripts/
│   ├── capture-tour.ts          # E2E filmé section par section
│   ├── audio-tour.ts            # TTS + timeline audio (ElevenLabs)
│   └── compose-tour.ts          # Compositor headless final (re-film le stage)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Hub — liste les tours, design admin
│   │   ├── tour/[id]/
│   │   │   ├── page.tsx         # Server entry, fetch tour from JSON
│   │   │   ├── TourClient.tsx   # Orchestrator (state + handlers + tabs)
│   │   │   └── _components/     # 5 tabs (script/capture/audio/voice/compose)
│   │   ├── compose/[id]/        # Compose stage (filmé par compose-tour.ts)
│   │   └── api/motion/          # Routes streaming NDJSON
│   └── lib/
│       ├── tour-loader.ts       # Lit tours/<id>.json (server-side fs)
│       ├── motion-tour-store.ts # Path ~/.webgen-motion/tours/
│       ├── motion-audio-store.ts# Audio library + ffprobe
│       ├── motion-categories.ts # Palette par category (data-driven en Sprint 4)
│       ├── pronunciation.ts     # Phonetic respelling (UZME → Youzmi)
│       ├── brand.ts             # Tokens UZME mappés slate (transitionnel)
│       └── types/tour.ts        # TourEntry / TourStep
├── ROADMAP.md                   # Sprints + futures + décisions
└── README.md                    # Quickstart user
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
   - Charge le manifest pour connaître format/dimensions/sections
   - Lance Puppeteer sur `/compose/<id>?autoplay=1` (la stage React)
   - Capture frame-par-frame pendant que la stage joue les sections dans le device frame
   - Encode `final.mp4` avec ffmpeg en mixant bg music + voix off
   - Mix : VO 1.0 + bg ducké à 0.10 si VO présente, sinon bg à 0.18

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
npx tsx scripts/compose-tour.ts --tour-id uzme-landing --tour-dir ~/.webgen-motion/tours/uzme-landing --fps 30
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
