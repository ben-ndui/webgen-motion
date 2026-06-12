<div align="center">

# GEN MOTION

**Motion Studio local-first** — capture, mixe et compose des vidéos motion design depuis n'importe quel site web. Aucun cloud, ta voix clonée, frame-accurate.

[![License](https://img.shields.io/badge/license-FSL--1.1--MIT-blue.svg)](#license)
[![Studio Edition](https://img.shields.io/badge/Studio_Edition-%2449_one--time-0A0A0A?logo=stripe&logoColor=white)](https://genmotion.app/download)
[![Apple Notarized](https://img.shields.io/badge/macOS-Apple%20Notarized-007AFF?logo=apple)](https://github.com/ben-ndui/webgen-motion/releases/latest)
[![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![Remotion](https://img.shields.io/badge/Remotion-4-0B84FF?logo=remotion)](https://remotion.dev/)
[![by Smooth & Design](https://img.shields.io/badge/by-Smooth%20%26%20Design-EC4899)](https://www.smoothandesign.fr)

**[⬇ Télécharger pour macOS](https://genmotion.app/download)** &nbsp;·&nbsp; **[💎 Acheter Studio $49](https://genmotion.app/download)** &nbsp;·&nbsp; [Démo live](#-démo) &nbsp;·&nbsp; [Site](https://genmotion.app)

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

## ⬇ Installation

### Option 1 — Télécharge l'app (recommandé)

Pour la majorité des utilisateurs. App desktop signée + notarisée Apple, lancement direct.

1. **Télécharge** le `.dmg` macOS arm64 : [genmotion.app/download](https://genmotion.app/download)
2. **Double-clique** → glisse `GEN MOTION` dans Applications
3. **Lance l'app** → le wizard de setup te guide pour configurer ta voix off (ElevenLabs cloud ou Voicebox local)

⚠ Windows + Linux + macOS Intel arrivent au prochain tag.

### Option 2 — Clone + dev (contributeurs / customization)

Pour contribuer, customiser, ou si tu veux runner depuis le source.

```bash
git clone https://github.com/ben-ndui/webgen-motion.git
cd webgen-motion
brew install ffmpeg      # macOS — pour l'encode des frames
npm install              # Next.js + Puppeteer + Chromium + Remotion
npm run dev              # http://localhost:3000
```

Tu atterris sur la **landing** GEN MOTION. Clique **Lancer le studio** → tu es sur le hub avec tes tours.

### Première vidéo

1. **`/setup`** → wizard 3 étapes pour configurer ton backend voix off
   - **ElevenLabs** (cloud) : API key + voice ID
   - **Voicebox** (local) : install [voicebox desktop](https://github.com/jamiepine/voicebox), on auto-detect la voix
2. **`/dashboard`** → **Nouveau tour** → nom, slug, format (16:9 / 9:16)
3. **`/tour/<id>`** → Édite le script, choisis ton style, clique **Capturer** → **Générer voix off** → **Composer**
4. **`~/.webgen-motion/tours/<id>/final.mp4`** est prête.

---

## 🚀 Trois façons de créer un tour

webgen-motion couvre tous les onboarding workflows — du bricoleur qui veut tout contrôler au designer qui veut un résultat en 2 clics.

### 1. **Manuel** — tu connais ton site, tu sais quoi raconter
**Nouveau tour** sur le dashboard → un squelette JSON s'écrit dans `tours/<slug>.json`. Tu édites dans le tab Script. ~5 min pour un pitch propre.

### 2. **Agent IA** — bring-your-own-key Claude (recommandé pour découverte rapide)
1. `/setup/agent` → colle ta clé Anthropic (Sonnet 4.6 par défaut, $3/$15 par M tokens)
2. Dashboard → **Générer avec IA** → URL du site + preset (pitch / demo / walkthrough / showcase)
3. L'agent fetch via Puppeteer headless, parse les sections (`data-tour-section`, semantic HTML), screenshot full-page, et produit un `TourEntry` complet avec narratif FR aligné sur les vraies positions scroll
4. Ouvre le tour → review dans le tab Script → capture

### 3. **Scaffold depuis ton repo** — multi-routes en un coup
Tu as un Next.js app existante, tu veux des seed tours pour chaque page ?
1. Dashboard → **Scaffold projet**
2. Colle le chemin absolu de ton repo + URL servie pendant capture
3. Le scanner walks `src/app/**/page.tsx` (App Router) ou `pages/` (legacy), extrait h1/h2 du source, écrit un fichier tour squelette par route dans `<projectPath>/tours-scaffold/`
4. Copie ceux qui t'intéressent dans `webgen-motion/tours/`, raffine avec l'Agent IA si besoin

Les trois workflows peuvent se chainer : scaffold pour la structure rapide → Agent IA pour le narratif → édition manuelle pour le polish.

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

## 🎙 Director's Console — le chat IA de l'éditeur

`⌘J` dans l'éditeur (ou la barre console en bas du dashboard) ouvre la
**Director's Console** : un REPL éditorial branché sur **ton** Claude
(clé BYOK du wizard `/setup/agent` — la clé ne quitte jamais ta machine).
Chaque échange est une **prise** numérotée :

- *« raccourcis la section 2 et rends la VO plus punchy »* → l'IA
  propose des step-cards **fantômes** que tu solidifies avec **Apply**
  (undo fiable : chaque op embarque son état d'avant) ;
- la **timeline ASCII** marque les sections dirty (`[S2* 4.9s]`) avec
  le bon hint — `re-capture requise` ou `re-générer la vo` ;
- slash commands `/capture` `/vo` `/compose` → run proposé, **Lancer**
  déclenche le **vrai pipeline** avec progression live dans la console
  (annulable Échap, proprement) ;
- scope une section avec `@S2`, historique `↑`, palette `/`.

Sur le dashboard, la console vit en **3 modes** : drawer bas, fenêtre
flottante, ou **fenêtre séparée** multi-écran (`/console/window`). Les
diffs proposés par le modèle sont validés côté serveur — index hors
bornes, step malformé ou sortie du scope `@Sn` → proposition rejetée,
jamais réparée en silence.

---

## ✂️ Edit Engine — un vrai monteur dans le pipeline

Entre l'analyse audio et le render, l'**Edit Engine** prend des décisions
de montage comme un monteur humain (tout est dans `edit-plan.json`,
inspectable) :

- **Trim des temps morts** — chaque section est coupée à sa dernière
  activité voix off + respiration ; vidéo ET voix restent sync. Les
  interactions visibles (clicks, swipes…) ne sont jamais coupées.
- **Cuts snappés sur la musique** — les frontières de sections tombent
  sur les beats détectés ; crossfades adaptatifs (punchy sur beat fort).
- **J-cuts** — la voix d'une section entre 250ms avant son visuel.
- **Extend-to-fit** — si la narration dépasse la vidéo, la section se
  prolonge par un freeze (Ken Burns toujours actif) au lieu de couper
  la voix en pleine phrase.
- **Sous-titres karaoké word-synced** — depuis l'alignement
  character-level ElevenLabs (`"subtitles": true` dans le tour).

Débrayable : `--no-edit-plan` / `--no-edit-trim` sur le compose.

---

## 📱 Capture d'apps mobiles natives (iOS / Android)

Un tour avec `"platform": "ios"` + `"appId": "com.example.app"` filme
une **app native** : Maestro pilote (`tapOn` / `swipe` / `inputText` /
`launchApp` / `back`), le simulateur iOS / émulateur Android est
enregistré, et tout l'aval (voix off, Edit Engine, compose, frame 3D
iPhone) marche pareil. Prérequis : `brew install mobile-dev-inc/tap/maestro`.

---

## 🎞 Export timeline .otio (Studio)

Pas satisfait du montage auto ? Le bouton **Timeline .otio** du tab
Compose exporte la timeline — sections déjà découpées, voix off et
musique déjà posées, markers sur les beats — à ouvrir dans **DaVinci
Resolve** (File → Import Timeline) ou **Premiere Pro** (File → Import).

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

## 💎 Editions

**Source-available · FSL · made in Nice.** GEN MOTION est sur [GitHub](https://github.com/ben-ndui/webgen-motion) — code lisible, auditable, forkable pour tout usage non-concurrent, et **chaque version devient MIT 2 ans après sa publication**. La Studio Edition débloque les outils pro.

| Edition | Prix | Cible | Inclus |
|---|---|---|---|
| 🟢 **Community** | **Gratuit** perpétuel | Indie hackers, dev curieux, side projects | Pipeline complet · 2 presets compose (Sober / Energetic) · 16:9 + 9:16 · Agent IA BYOK · Sprint UX (recapture, reorder, trim, upload) · Scaffold projet · Local-first total |
| 🟣 **Studio** | **[$49 one-time perpétuel](https://genmotion.app/download)** | Créateurs pro, agences | Tout Community + Frames 3D iPhone/MacBook (R3F) · Presets Cinematic & Glitch · Music library managée · Multi-format export simultané · Watermark removal · Mises à jour incluses à vie |
| ⚫ **Enterprise** | Sur devis | Agences digitales, plateformes | Tout Studio + White-label · API headless (CI/CD) · SSO · Support dédié + SLA · [contact@smoothandesign.fr](mailto:contact@smoothandesign.fr) |

**Achat one-time perpétuel** (Davinci-style) : pas d'abonnement, pas de SaaS lock-in, mises à jour à vie. La license est un fichier `.license` signé Ed25519 que tu télécharges après paiement, à installer dans Settings → License de l'app. Vérification 100% locale, aucun appel serveur.

Voir `src/lib/edition.ts` pour la liste des 23 feature flags définis (10 actifs en Community, 8 unlock en Studio, 5 en Enterprise).

---

## 🤝 Contributing

Issues et PRs bienvenues. Pour les chantiers ouverts voir [`ROADMAP.md`](ROADMAP.md) et [`CHANGELOG.md`](CHANGELOG.md).

Pour une contribution significative, ping [contact@smoothandesign.fr](mailto:contact@smoothandesign.fr).

## License

**[FSL-1.1-MIT](LICENSE.md)** (Functional Source License) : libre d'utiliser,
modifier, redistribuer et auditer GEN MOTION pour tout usage **sauf produit ou
service concurrent**. Chaque version est automatiquement re-licenciée **MIT
deux ans** après sa publication. Les versions ≤ 0.2.3 publiées sous mention
MIT restent MIT.

"GEN MOTION" et "Smooth & Design" sont des marques de NDUI Amadou Be-Ngally. Conditions de vente : [CGV](https://genmotion.app/cgv).

---

<div align="center">

**[genmotion.app](https://genmotion.app)** &nbsp;·&nbsp; **[Acheter Studio $49](https://genmotion.app/download)** &nbsp;·&nbsp; [Contact](mailto:contact@smoothandesign.fr)

Made in Nice by **[Smooth & Design](https://www.smoothandesign.fr)** · Fair-code FSL · Davinci-style perpetual

</div>
