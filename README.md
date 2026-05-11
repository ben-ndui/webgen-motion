<div align="center">

# webgen-motion

**Motion Studio local-first** — capture, mixe et compose des vidéos motion design depuis n'importe quel site web. Aucun cloud, ta voix clonée, frame-accurate.

[![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![Remotion](https://img.shields.io/badge/Remotion-4-0B84FF?logo=remotion)](https://remotion.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![by Smooth & Design](https://img.shields.io/badge/by-Smooth%20%26%20Design-EC4899)](https://www.smoothandesign.fr)

`npx create-webgen-motion@latest my-promo` &nbsp;·&nbsp; [Démo live](#-démo) &nbsp;·&nbsp; [Docs](#-quickstart) &nbsp;·&nbsp; [Site](https://www.smoothandesign.fr)

</div>

---

## 🎬 Démo

> 100 secondes — webgen-motion filme sa propre interface à travers ses 5 surfaces (hub · setup · éditeur · voix off · compose) avec voix off ElevenLabs en mode narratif continu et style Energetic.

<video src="public/demo.mp4" controls width="100%"></video>

> Tour source : [`tours/webgen-motion-pitch.json`](tours/webgen-motion-pitch.json) · 8 sections · 4 catégories · 18 markers narratifs · rendu par Remotion en ~150s wall time.

---

## 💡 Pourquoi webgen-motion ?

| Avant | Avec webgen-motion |
|---|---|
| Quelques jours dans After Effects | **5 minutes**, sur ta machine |
| Stock footage générique | **Ton vrai site** filmé section par section |
| Voix off en studio ou stock | **Ta voix clonée** (ou n'importe quelle voix ElevenLabs / Voicebox) |
| 1 style figé | **4 presets** : Sober · Energetic · Cinematic · Glitch |
| Vidéos finales sur S3 / Vimeo / Dropbox | **Local-first** — tout reste dans `~/.webgen-motion/` |

---

## ⚡ Quickstart

### Option 1 — Scaffold (recommandé)

```bash
npx create-webgen-motion@latest my-promo
cd my-promo
brew install ffmpeg      # macOS — pour l'encode des frames
npm run dev              # http://localhost:3000
```

Tu atterris sur la **landing** webgen-motion. Clique **Lancer le studio** → tu es sur le hub avec tes tours.

### Option 2 — Clone direct (contributions)

```bash
git clone https://github.com/ben-ndui/webgen-motion.git
cd webgen-motion
npm install              # Next.js + Puppeteer + Chromium + Remotion
brew install ffmpeg
npm run dev
```

### Première vidéo

1. **`/setup`** → wizard 3 étapes pour configurer ton backend voix off
   - **ElevenLabs** (cloud) : API key + voice ID
   - **Voicebox** (local) : install [voicebox desktop](https://github.com/jamiepine/voicebox), on auto-detect la voix
2. **`/dashboard`** → **Nouveau tour** → nom, slug, format (16:9 / 9:16)
3. **`/tour/<id>`** → Édite le script, choisis ton style, clique **Capturer** → **Générer voix off** → **Composer**
4. **`~/.webgen-motion/tours/<id>/final.mp4`** est prête.

---

## 🎛 Le workflow en 5 onglets

Une page `/tour/<id>` rassemble tout dans 5 tabs avec un bouton **Save persistant** dans le top bar :

| Tab | Rôle |
|---|---|
| **📝 Script** | Édite tes steps (sections / overlays / clicks / scrolls / waits) — UI form ou JSON direct |
| **🎥 Capture** | Puppeteer film ton site section par section, encode chaque section en MP4 |
| **🎵 Audio** | Library musique de fond (upload MP3/WAV) + sliders volumes (auto-duck sur la voix off) |
| **🎙 Voix off** | Génère la VO via ElevenLabs / Voicebox · mode **per-step** ou **narratif continu** + bouton **Calibrer** qui aligne ta timeline sur les vrais timings char-level |
| **🎬 Compose** | **Remotion** assemble : device frame (Mac chrome / iPhone), Ken Burns, transitions par catégorie, mix audio. Sélectionne un des 4 style presets et clique. |

---

## 🎨 Style presets (Compose)

| Preset | Use case | Effets |
|---|---|---|
| 🟦 **Sober** | Corporate / documentary | Ken Burns minimal, fade uniquement, pas de pulse |
| 🟪 **Energetic** *(défaut)* | Produit / SaaS punchy | Ken Burns full, 5 transitions variées par catégorie, beats pulse + halo pause |
| 🟧 **Cinematic** | Storytelling lent | Wipe-down vertical, Ken Burns mesuré, halo subtil |
| 🟥 **Glitch** | Tech / AI | Glitch chromatic partout, Ken Burns max, pulses forts |

Switch en 1 clic depuis le tab **Compose** — la même capture sort en 4 vidéos visuellement très différentes.

---

## 🧠 Mode narratif continu (avancé)

Pour une voix off naturelle où le pacing parlé pilote le visuel :

1. Tab **Voix off** → toggle **Narrative**
2. Écris ton script entier avec des markers `[step:N]` aux moments où chaque overlay doit apparaître
3. **Générer** → ElevenLabs renvoie un alignment caractère par caractère
4. **Calibrer la timeline** → les `dwellMs` de tes steps se mettent à jour automatiquement pour matcher la VO au mot près
5. Re-Capture → tes sections MP4 ont les bonnes durées
6. Compose → sync parfaite

---

## 🗂 Architecture

```
webgen-motion/
├── tours/                       # Catalogue de tours (JSON, data-driven)
│   ├── webgen-motion-pitch.json # Le tour démo (80s, Energetic)
│   └── ...
├── scripts/
│   ├── capture-tour.ts          # Puppeteer E2E + encode MP4
│   ├── audio-tour.ts            # ElevenLabs/Voicebox TTS + alignment
│   ├── analyze-audio.ts         # silencedetect + onset detection
│   └── compose-tour.ts          # Spawn Remotion render
├── remotion/
│   ├── Root.tsx                 # Compositions tour-16x9, tour-9x16
│   ├── Tour.tsx                 # Composition principale
│   ├── SectionPlayer.tsx        # Section playback + Ken Burns
│   ├── BeatsLayer.tsx           # Beats reactive layer
│   └── lib/
│       ├── transitions.ts       # 5 transitions par catégorie
│       └── style-presets.ts     # Sober / Energetic / Cinematic / Glitch
├── src/app/                     # Next.js 16 App Router
│   ├── page.tsx                 # Landing
│   ├── dashboard/page.tsx       # Hub des tours
│   ├── tour/[id]/               # Éditeur (5 tabs)
│   ├── compose/[id]/            # Live preview (audio playback sans render)
│   ├── help/page.tsx            # Docs intégrées
│   └── setup/page.tsx           # Wizard backend voix off
└── packages/
    └── create-webgen-motion/    # `npx create-webgen-motion`
```

Storage persistant en `~/.webgen-motion/` :

```
~/.webgen-motion/
├── config.json                  # Backend voix off (wizard)
├── audio/                       # Musique de fond uploadée
├── vo-cache/                    # TTS cache (sha1 par voix + texte)
└── tours/<id>/
    ├── manifest.json
    ├── section-NN-<cat>.mp4
    ├── voiceover.mp3
    ├── voiceover-alignment.json
    ├── audio-analysis.json
    └── final.mp4
```

Tout reste sur ta machine. Survit aux reboots. Jamais commit dans git.

---

## 🧰 Stack

| Layer | Outil |
|---|---|
| Capture E2E | [Puppeteer](https://pptr.dev) + Chromium |
| TTS Cloud | [ElevenLabs](https://elevenlabs.io) — voice cloning + char-level alignment |
| TTS Local | [Voicebox](https://github.com/jamiepine/voicebox) — 7 engines (qwen, kokoro, chatterbox…) |
| Audio analysis | FFmpeg `silencedetect` + `astats` (onset detection RMS) |
| Compositor | [Remotion 4](https://remotion.dev) — React → MP4 frame-accurate |
| Frontend | [Next.js 16](https://nextjs.org) + Tailwind v4 + Framer Motion + lucide-react |
| Encoding | FFmpeg h264 + AAC stereo 44.1k |

---

## 📚 Documentation

- **`/help` route** (in-app) — workflow, schéma JSON, FAQ, multi-projects
- **[`CLAUDE.md`](CLAUDE.md)** — guide pour agents IA qui installent / itèrent
- **[`ROADMAP.md`](ROADMAP.md)** — sprints livrés + futurs
- **[`docs/your-first-tour.md`](docs/your-first-tour.md)** — du clone à la première vidéo

---

## ⚙️ Commands

```bash
npm run dev              # dev server (Turbopack)
npm run build            # production build
npm run lint

# CLI direct (debug, sans dashboard)
npx tsx scripts/capture-tour.ts --tour-id <id> --tour-dir ~/.webgen-motion/tours/<id>
npx tsx scripts/audio-tour.ts --tour-id <id> --tour-dir ~/.webgen-motion/tours/<id>
npx tsx scripts/compose-tour.ts --tour-id <id> --tour-dir ~/.webgen-motion/tours/<id>

# Remotion
npm run remotion:studio  # interactive preview
npm run remotion:render  # one-shot hello-world sanity check
```

---

## 📦 Pré-requis

- **Node ≥ 20**
- **FFmpeg** sur le PATH (`brew install ffmpeg` sur macOS, `apt install ffmpeg` Linux)
- **Chromium** : fourni automatiquement par Puppeteer au premier `npm install`
- **Backend voix off** : ElevenLabs (Starter ≥ $5/mois pour le voice cloning) **OU** [Voicebox desktop](https://github.com/jamiepine/voicebox) (gratuit, 100% local)

---

## 🤝 Contributing

Issues et PRs bienvenues. Pour les chantiers ouverts voir [`ROADMAP.md`](ROADMAP.md).

## License

MIT — voir [`LICENSE`](LICENSE).

---

<div align="center">

Made with ❤ in Nice by **[Smooth & Design](https://www.smoothandesign.fr)**

</div>
