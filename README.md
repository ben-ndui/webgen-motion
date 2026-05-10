# webgen-motion

> Motion Studio portable — by **Smooth & Design**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   E2E filmé  →  Voix off IA  →  Compose final      │
│   Puppeteer    ElevenLabs       Mac chrome / iPhone │
│                                                     │
│   100% local · 0 cloud · 0 vendor lock-in          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Génère des vidéos motion design à partir de ton site ou ton app web.
Tout tourne sur ta machine. Tu clones, tu configures, tu génères.

## Quickstart

```bash
git clone https://github.com/ben-ndui/webgen-motion.git
cd webgen-motion
npm install              # installe Next.js + Puppeteer + Chromium
brew install ffmpeg      # macOS — pour l'encode des frames
npm run dev              # http://localhost:3000
```

Ouvre [http://localhost:3000](http://localhost:3000) → tu vois le **hub**
avec les tours bundlés. Clique sur le bouton **Setup** en haut à droite
pour configurer ElevenLabs (voix off) en 2 minutes.

## Le workflow en 5 onglets

Chaque tour a une page dédiée à `/tour/<id>` avec 5 onglets state-based :

| Tab | Rôle |
|---|---|
| **Script** | Liste des steps + édition voix off inline + format 16:9 / 9:16 |
| **Capture** | Lance Puppeteer sur ton site, film section par section, encode en MP4 |
| **Audio** | Library musique (upload MP3/WAV/M4A) + sliders volumes mix |
| **Voix off** | Génère la timeline VO via ElevenLabs avec ta voix clonée |
| **Compose** | Re-films la stage React dans une Mac chrome (16:9) ou iPhone frame (9:16) avec mix audio + transitions |

État persisté entre tabs et entre sessions (localStorage + filesystem).

## Définir un tour

Tours = JSON dans `tours/<id>.json` (data-driven, pas de TypeScript).
Le hub liste auto tous les fichiers du dossier au refresh.

```json
{
  "id": "mon-site",
  "name": "Mon site · Landing",
  "description": "Tour rapide de ma landing.",
  "estimatedSec": 30,
  "startPath": "/",
  "baseUrl": "https://mon-site.com",
  "format": "16:9",
  "steps": [
    {
      "type": "section",
      "categoryId": "branding",
      "title": "Mon Brand",
      "subtitle": "Tagline punchy",
      "voiceover": "Bienvenue chez Mon Brand."
    },
    { "type": "wait", "dwellMs": 1500 },
    {
      "type": "overlay",
      "text": "Promesse principale",
      "position": "center",
      "dwellMs": 2400
    },
    { "type": "scroll", "to": 800, "dwellMs": 1800 }
  ]
}
```

Schéma complet : voir [`src/lib/types/tour.ts`](src/lib/types/tour.ts).

## Storage local

```
~/.webgen-motion/
├── config.json                     # Setup wizard (ElevenLabs creds)
├── audio/
│   ├── index.json                  # Audio library metadata
│   └── <slug>-<epoch>.mp3          # Tracks uploadées
├── vo-cache/
│   └── <sha1>.mp3                  # TTS cache (par voix + texte)
└── tours/
    └── <tourId>/
        ├── manifest.json
        ├── section-NN-<cat>.mp4    # Captures par section
        ├── voiceover.mp3           # Timeline VO assemblée
        └── final.mp4               # Clip final composé
```

Tout reste sur ta machine. Survit aux reboots. Jamais commit dans git.

## Tours bundlés (démo)

| Tour | Format | Ce qu'il film |
|---|---|---|
| `uzme-landing` | 16:9 | Landing UZME desktop avec 4 sections (Branding · Features · Rôles · App) |
| `uzme-landing-portrait` | 9:16 | Variant TikTok / Reels / Stories |
| `webgen-motion-itself` | 16:9 | **Meta-démo** : webgen-motion film sa propre interface (Hub → tabs → compose → setup). Lance le dev server, génère ce tour, t'as la promo officielle de l'outil |

## Configuration

Deux options :

**Option 1 — Setup wizard (recommandé)** : http://localhost:3000/setup
→ formulaire ElevenLabs API key + voice ID → écrit dans
`~/.webgen-motion/config.json`. Aucune var d'env requise.

**Option 2 — `.env.local`** :
```bash
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=<voiceId>
ELEVENLABS_MODEL=eleven_multilingual_v2  # optionnel
```

`config.json` override l'env si les deux existent.

## Commandes

```bash
npm run dev          # dev server (Turbopack, hot reload)
npm run build        # production build
npm run lint         # ESLint

# CLI direct sans dashboard (debug)
npx tsx scripts/capture-tour.ts \
  --tour-id uzme-landing \
  --base-url https://uzme.app \
  --fps 30 \
  --out ~/.webgen-motion/tours/uzme-landing

npx tsx scripts/audio-tour.ts \
  --tour-id uzme-landing \
  --tour-dir ~/.webgen-motion/tours/uzme-landing

npx tsx scripts/compose-tour.ts \
  --tour-id uzme-landing \
  --tour-dir ~/.webgen-motion/tours/uzme-landing \
  --fps 30
```

## Pré-requis système

- **Node 20+**
- **ffmpeg** sur le PATH (`brew install ffmpeg` sur macOS)
- **ElevenLabs account** (Starter $5/mois minimum pour le voice cloning, sinon une voix stock suffit)
- **Chromium** : fourni automatiquement par puppeteer au premier `npm install`

## Stack

Next.js 16 (App Router + Turbopack) · Tailwind v4 · Geist Sans/Mono ·
lucide-react · framer-motion · Puppeteer · FFmpeg · ElevenLabs TTS.

## Pour aller plus loin

- [`CLAUDE.md`](CLAUDE.md) — guide pour agents IA qui installent / itèrent
- [`ROADMAP.md`](ROADMAP.md) — sprints, futures, décisions architecturales

## License

À définir.

---

Made with ❤ in Nice by [Smooth & Design](https://www.smoothandesign.fr).
