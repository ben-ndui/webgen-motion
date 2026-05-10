# webgen-motion

> Outil portable de génération de vidéos motion design — by Smooth & Design

E2E filmé de ton site / app web · voice-over IA (ElevenLabs) · bg music · Mac
chrome / iPhone frame · entièrement local-first.

Tu clones, tu configures tes API keys, tu pointes vers ton projet, et tu
génères. Pas de cloud, pas de SaaS, pas de vendor lock-in. Tu cours sur ta
machine.

## Pré-requis

- **Node 20+** (Next 16 + Turbopack)
- **ffmpeg** sur le `PATH` (`brew install ffmpeg` sur macOS)
- **Chromium** — fourni automatiquement par puppeteer au premier `npm install`

## Démarrage

```bash
git clone https://github.com/ben-ndui/webgen-motion.git
cd webgen-motion
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) → tu vois la liste des
tours bundlés (`tours/uzme-landing.json`, `tours/uzme-landing-portrait.json`).

## Configurer tes API keys

Crée `.env.local` à la racine :

```bash
ELEVENLABS_API_KEY=sk_...                 # https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_VOICE_ID=ton_voiceId            # voix clonée ou voix stock
ELEVENLABS_MODEL=eleven_multilingual_v2    # optionnel, défaut OK
```

Sans ces clés, tout le reste (capture, compose) marche sauf la génération de
voix off.

## Workflow

1. **Hub `/`** liste tes tours bundlés dans `tours/`.
2. **Tour preview `/tour/<id>`** :
   - Choisis le format (`16:9` / `9:16`)
   - Clique **Capturer en MP4** → Puppeteer ouvre une fenêtre, film ton site
     section par section, encode en `~/.webgen-motion/tours/<id>/section-NN.mp4`
   - Édite les voix off step par step dans le panel **Voix off**
   - Upload une track dans la **Music library**
   - Clique **Générer voix off** → ElevenLabs TTS → `voiceover.mp3`
   - Clique **Composer le clip final** → headless re-films le compositor avec
     Mac chrome / iPhone frame + bg music + voix → `final.mp4`
3. **Compose `/compose/<id>`** preview interactive du compositor avant export.

## Définir un tour

Tours = JSON dans `tours/<id>.json`. Schéma : voir
`src/lib/types/tour.ts`. Exemple minimaliste :

```json
{
  "id": "mon-site",
  "name": "Mon site · Landing",
  "description": "Tour rapide de la landing.",
  "estimatedSec": 30,
  "startPath": "/",
  "baseUrl": "https://mon-site.com",
  "format": "16:9",
  "steps": [
    {
      "type": "section",
      "categoryId": "branding",
      "title": "Mon Brand",
      "subtitle": "Tagline",
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

## Storage

Toutes les sorties sont en `~/.webgen-motion/` (hors repo) :

- `~/.webgen-motion/tours/<id>/` — manifest + section MP4s + voiceover + final
- `~/.webgen-motion/audio/` — bg music library (MP3/WAV/M4A/AAC/OGG, ≤25 MB)
- `~/.webgen-motion/vo-cache/` — TTS cache keyed par sha1(voiceId|model|text)

Survit aux reboots, partagé entre tous les tours, jamais commit dans git.

## Stack

- Next.js 16 + Turbopack
- Puppeteer + ffmpeg pour la capture E2E
- ElevenLabs TTS pour la voix off
- Tailwind v4 + slate palette + Geist Sans
- lucide-react + react-icons (transitionnel)

## Architecture

```
webgen-motion/
├── tours/                       # Catalogue de tours JSON (data-driven)
├── scripts/
│   ├── capture-tour.ts          # E2E filmé section par section
│   ├── audio-tour.ts            # TTS + timeline audio
│   └── compose-tour.ts          # Compositor headless final
├── src/
│   ├── app/
│   │   ├── page.tsx             # Hub
│   │   ├── tour/[id]/           # Preview + handlers
│   │   ├── compose/[id]/        # Compose stage (filmé par compose-tour.ts)
│   │   └── api/motion/          # Routes streaming NDJSON
│   └── lib/
│       ├── tour-loader.ts       # Lit tours/*.json
│       ├── motion-tour-store.ts # Path ~/.webgen-motion/tours/
│       ├── motion-audio-store.ts# Audio library + ffprobe
│       ├── motion-categories.ts # Palette par category
│       ├── pronunciation.ts     # Phonetic respelling map (ex. UZME → Youzmi)
│       └── types/tour.ts        # TourEntry / TourStep
```

## License

À définir.
