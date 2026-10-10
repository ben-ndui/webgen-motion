# SMOOTH_MANIFEST — GEN MOTION (repo `webgen-motion`)

Studio local-first de génération de vidéos motion design : Puppeteer filme un site/app section par section, ElevenLabs/Google/Voicebox pose la voix off, Remotion compose un `final.mp4` frame-accurate. App desktop Tauri + vitrine Next.js.

## Identité

- **Brand / domaine** : GEN MOTION · `genmotion.app` (vitrine marketing + checkout Stripe sur Vercel)
- **Repo slug** : `webgen-motion` (préservé rétro-compat git/npm) — GitHub `ben-ndui/webgen-motion`
- **Branche** : défaut = `main`. Mode « Film de marque » développé sur une branche de worktree, en attente de validation par Ben (pas mergé)
- **Stack** : Next.js 16 (App Router + Turbopack) · React 19 · Tailwind v4 · TypeScript strict · Remotion 4 + `@remotion/three` · Puppeteer 24 · FFmpeg (système) · Tauri 2 (Rust shell) · Stripe v22 · Ed25519 (`node:crypto`) · framer-motion · Geist Sans/Mono · lucide-react
- **Version** : `package.json` 0.6.0 · licence **FSL-1.1-MIT** (source-available, MIT 2 ans après release)
- **Backend cloud** : AUCUN pour le pipeline core (tout local). Vercel ne sert que la vitrine + Stripe. Pas de Firebase/Supabase.
- **Package local lié** : `smoothandesign-tts` (`file:../smoothandesign_tts`)

## Architecture

```
tours/                    # Catalogue tours JSON data-driven (uzme-landing, webgen-motion-pitch, pa-club-dashboard, restaurant-epicentre…, demo-ios-settings)
films/                    # Fiches « Film de marque » au format FilmSpec (kotizo.json)
scripts/                  # Runners CLI (spawnés par les routes API)
  capture-tour.ts         # E2E web filmé (Puppeteer + ffmpeg)
  capture-mobile.ts       # E2E mobile iOS/Android (Maestro + simctl/adb)
  audio-tour.ts           # TTS + timeline audio
  compose-tour.ts         # Compose runner → spawn `remotion render`
  render-film.ts          # Film de marque : valide la fiche + médias, rend la composition `Film` (ou `Bibliotheque` avec --bibliotheque)
  analyze-audio.ts        # ffmpeg silencedetect + beats RMS
  agent-generate-tour.ts  # Agent IA (Claude) génère un tour depuis une URL
  lib/edit-plan.ts        # Edit Engine (EDL : trims, beat-snap, J-cuts, VO, sous-titres)
  export-otio.ts          # Export .otio → DaVinci/Premiere (Studio)
  issue-license.mjs / generate-license-keypair.mjs  # backoffice Ed25519 (Ben)
  notarize-and-staple.mjs # pipeline Apple Notary
src/app/                  # Next : page.tsx (landing), dashboard/ (hub tours), tour/[id]/ (éditeur 5 tabs),
                          #   compose/[id]/ (live preview), setup/, notary/, download/, thanks/, (legal)/
  tour/[id]/_components/console/  # Director's Console — chat IA BYOK (dock ⌘J)
  api/motion/             # routes pipeline (capture/audio/compose/license/notary/models/status…)
  api/stripe/{checkout,webhook}/  # paiement
  api/version/            # update checker desktop
src/lib/                  # tour-loader (fs server-only), motion-tour-store, motion-audio-store,
                          #   edition.ts (resolveEdition), license/ (verify Ed25519), stripe.ts,
                          #   llm-providers/ (provider Anthropic Claude), types/tour.ts
remotion/                 # Compositions : Root/Tour, SectionPlayer, IPhoneFrame, MacChrome, film/ (moteur Film de marque),
                          #   BeatsLayer, IntroOutro, three/ (frames 3D R3F), lib/{transitions,style-presets}
src-tauri/                # Coque desktop (tauri.conf.json, Cargo.toml, entitlements.plist, sidecars node+ffmpeg)
webgen-motion.config.ts   # Edition + defaults (baseUrl, format, composeStyle, watermark)
docs/                     # RECURRENT-TRACKING.md, design/, releases/, TEST-LOCAL-STRIPE.md…
ROADMAP.md · CHANGELOG.md · README.md · CLAUDE.md
```

## Features

- **Capture E2E web** : Puppeteer film section par section (splash cards + overlays motion), encode JPEG→MP4 ffmpeg (`scripts/capture-tour.ts`, `POST /api/motion/tour/run`)
- **Capture mobile** : iOS/Android via Maestro + simctl/adb, format 9:16 (`scripts/capture-mobile.ts`)
- **Voice-over** : ElevenLabs TTS (voix clonée, cache disk sha1 + pronunciation map) OU Voicebox local offline OU Google TTS (branche courante) (`scripts/audio-tour.ts`, `POST /api/motion/tour/audio/voice/run`)
- **Edit Engine** : trim temps morts, cuts snappés sur beats, J-cuts (VO 250ms avant visuel), crossfades adaptatifs, sous-titres karaoké word-synced → `edit-plan.json` (`scripts/lib/edit-plan.ts`)
- **Compose Remotion** : device frames (Mac chrome 16:9 / iPhone 9:16), 4 style presets (Sober/Energetic/Cinematic/Glitch), Ken Burns dirigé, BeatsLayer audio-réactif, frames 3D R3F (Studio) (`scripts/compose-tour.ts`, `remotion/Tour.tsx`)
- **Director's Console** : chat IA BYOK (provider Claude), dock ⌘J, prises + diffs + runs réels, fenêtre multi-écran (`src/app/tour/[id]/_components/console/`, `src/app/console/window/`)
- **Agent génération** : Claude génère un tour JSON depuis une URL (`scripts/agent-generate-tour.ts`)
- **Desktop app** : Tauri 2 signé + notarisé Apple, `.dmg` macOS arm64, update checker (`src-tauri/`, `.github/workflows/desktop-release.yml`)
- **Film de marque** (mode A) : film 16:9 + court 9:16, FR/EN, calé sur la musique, à partir d'UNE fiche `films/<id>.json` (`FilmSpec`). Moteur = `src/` du gabarit brain `gabarits/film-motion` (commit cab1252) copié dans `remotion/film/` (logique inchangée), composition générique `Film` (`remotion/film/CompositionFilm.tsx`). Médias hors repo dans `~/.webgen-motion/films/<id>/public/` (= `--public-dir`), rendus dans `.../out/<declinaison>.mp4`. Chaîne : `src/lib/film-{store,loader,medias,etat,rendu}.ts` → `scripts/render-film.ts` → `POST /api/motion/film/render` (NDJSON) + `GET /api/motion/film/video`. UI : section du hub (`src/app/_components/hub-films.tsx`) + page `/film/[id]` (`src/app/film/[id]/`). Ouvert à toutes les éditions (question Studio en suspens)
- **Bibliothèque de plans** (dans le mode Film de marque, synchronisée avec le gabarit brain commit 5a03417, 10/10/2026) : `remotion/film/bibliotheque/` = typo cinétique, barre d'adresse qui se tape, éventail de vraies captures, logo construit. Bloc optionnel `bibliotheque` de la fiche (+ `textes.<langue>.bibliotheque`), validé dès le chargement (`erreursDeLaBibliotheque` dans `film-loader`). Composition `Bibliotheque` à côté de `Film` (mêmes inputProps). Rendu : `render-film.ts --bibliotheque` → `out/<declinaison>.bibliotheque.mp4` (verrou et fichier partiel à part ; le point rend toute collision avec un nom de déclinaison impossible). Route `POST /api/motion/film/render` : `{ filmId, declinaison, rendu?: "film" | "bibliotheque" }` ; `GET /api/motion/film/video?...&rendu=bibliotheque`. Chaque média dit à quel rendu il sert (`usages`) : une capture de l'éventail ne bloque pas le film ; le logo fourni en image (`marque.logo.type = "image"`) est attendu pour les deux. Écran `/film/[id]` : section « Bibliothèque de plans » si la fiche en a une. L'aperçu App Store du gabarit n'est PAS repris.
- **Éditions gated** : Community gratuit / Studio payant / Enterprise, licence Ed25519 offline-first (`src/lib/edition.ts`, `src/lib/license/`)

## Modèle de données

Pas de DB. Deux stores :

- **Tours** = fichiers `tours/<id>.json` validés `TourEntry` (`src/lib/types/tour.ts`) :
  - `id` (fallback filename), `name`, `description`, `estimatedSec`, `startPath`, `baseUrl?` (def `localhost:3000`), `format?` (`16:9`|`9:16`), `platform?` (`web`|`ios`|`android`), `appId?`/`deviceId?` (mobile), `bgMusic?`, `subtitles?`, `steps[]`
  - `steps` web : `section|overlay|scroll|wait|click|type|select|hover|goto|keypress` · mobile : `section|overlay|wait|launchApp|tapOn|inputText|swipe|back`
- **Artefacts** = `~/.webgen-motion/` (hors repo/git, survit aux reboots) :
  - `audio/` (library MP3/WAV + index.json) · `vo-cache/` (TTS keyed sha1(voiceId|model|text)) · `tours/<id>/` (manifest.json + section-NN.mp4 + voiceover.mp3 + final.mp4 + edit-plan.json + audio-analysis.json)
  - `config.json` (écrit par `/setup`, override `.env.local`) · `.license` (Ed25519 signée)
  - `films/<id>/public/` (captures par langue + musique) · `films/<id>/out/<declinaison>.mp4` (+ `.<nom>.en-cours.mp4` et `.<nom>.verrou` pendant un rendu)
- **Films** = `films/<id>.json` validés par `validerSpec` (`remotion/film/validerSpec.ts`) : marque (couleurs, police Google Fonts par son nom, logo), textes fr/en, écrans, musique (tempo MESURÉ), déclinaisons, aperçu

## Intégrations

- **Stripe v22** : checkout `/api/stripe/checkout` + `/api/stripe/webhook`. Stripe = source de vérité (pas de DB). Objectif récurrent : `price` mensuel/annuel (`mode: subscription`) + Lifetime (`mode: payment`) — env `STRIPE_PRICE_STUDIO_{MONTHLY,ANNUAL,LIFETIME}`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Plan complet : `docs/RECURRENT-TRACKING.md`
- **Licences Ed25519** : signées/vérifiées OFFLINE (`node:crypto`), `expiresAt` = fin période + grâce (abo) ou `null` (lifetime). Backoffice : `scripts/issue-license.mjs`. Refresh auto près de l'expiration via Stripe
- **IA (Claude)** : `src/lib/llm-providers/` (abstraction Anthropic), BYOK côté Director's Console + `agent-generate-tour.ts`
- **PostHog** : tracking web PUBLIC uniquement — JAMAIS dans l'app desktop (skip si `window.__TAURI__` / meta `webgen-desktop-token`). `posthog-js` (client) + `posthog-node` (webhook). Env `NEXT_PUBLIC_POSTHOG_KEY`, `_HOST` (EU)
- **TTS** : ElevenLabs (`ELEVENLABS_API_KEY`, `_VOICE_ID`, `_MODEL`) / Voicebox local / Google (`GOOGLE_APPLICATION_CREDENTIALS`, branche en cours) / package `smoothandesign-tts`
- **Apple Notary** : `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_SPE_PASSWORD` → `scripts/notarize-and-staple.mjs`

## Commandes

```bash
npm install               # + Puppeteer télécharge Chromium ; brew install ffmpeg requis
npm run dev               # http://localhost:3000 (Turbopack)
npm run build             # build prod — LANCER AVANT PUSH (Vercel type-check)
npm run test              # Vitest (watch) · npm run test:run (CI)
npm run lint              # ESLint

npm run remotion:studio   # Remotion studio
npm run compose           # tsx scripts/compose-tour.ts
npm run tauri:dev / :build  # coque desktop
npm run tauri:icon        # icônes depuis src-tauri/icons/source.png

# CLI pipeline direct (debug, sans dashboard) :
npx tsx scripts/capture-tour.ts --tour-id uzme-landing --base-url https://uzme.app --fps 30 --out ~/.webgen-motion/tours/uzme-landing
npx tsx scripts/audio-tour.ts   --tour-id uzme-landing --tour-dir ~/.webgen-motion/tours/uzme-landing
npx tsx scripts/compose-tour.ts --tour-id uzme-landing --tour-dir ~/.webgen-motion/tours/uzme-landing
npx tsx scripts/render-film.ts --film-id kotizo [--declinaison Court-FR]   # sans --declinaison : toutes
```

## Pièges

- **`npm run build` avant push** : vitest/lint ne type-checkent pas ; un build rouge fige la prod Vercel en silence. Vérifier les routes par curl.
- **Tests au fur et à mesure** (convention S&D) : Vitest+RTL posés, tester phase par phase, `npm test` avant push. Rien poussé sans OK explicite de Ben sur les chantiers UI/exploratoires.
- **Rendu Remotion (tours démo PA)** : utiliser `--gl angle` (PAS swangle → tuilage), transitions opacité-pure, sous-titres SANS `backdrop-filter`. Voix off Google gratuite en démo.
- **Next 16 — `params` est une Promise** : `await params` (server) / `use(params)` (client).
- **`tour-loader.ts` = fs server-only** : l'importer dans un client component plante Turbopack ("Code generation for chunk item errored"). Fetch côté server → pass en prop.
- **Storage** : toujours passer par `src/lib/motion-tour-store.ts` (`getMotionTourDir`), jamais hardcoder `tmpdir()` (wipé au reboot) ni un chemin uzme-specific.
- **Shim `__name` Puppeteer** : `capture-tour.ts` injecte `window.__name = fn => fn` (helper esbuild absent du browser). `__name is not defined` = nouveau helper à ajouter au shim.
- **Brand tokens transitionnels** : `src/lib/brand.ts` exporte `UZME` mappé slate = pont temporaire des composants migrés depuis uzme-support.
- **Design** : brand noir & blanc strict, Geist, pas d'icônes décoratives (icônes load-bearing only), max 250 lignes/fichier.
- **Film de marque — annulation** : Remotion ne s'arrête pas sur SIGTERM (il relance même son Chrome, hors du groupe de process) et le SIGTERM arrive deux fois (groupe + relais tsx). `render-film.ts` écoute avec `process.on` (pas `once`) et tue Remotion + sa descendance en SIGKILL (`src/lib/process-tree.ts`) ; la route ajoute un SIGKILL à 10 s. Le mp4 n'est renommé en livrable qu'après succès, et la route exige un mtime postérieur au lancement.
- **Film de marque — vitrine** : `/film/[id]` répond 404 et le hub masque la section quand `isPublicWebRuntime` (Vercel) : fiches = projets clients. Les films ne sont pas embarqués dans l'app desktop (seul `tours/` l'est).
- **Push GitHub ben-ndui** : `env -u GITHUB_TOKEN git -c credential.helper='!gh auth git-credential' push` (sinon 403 write).

> MAJ : 2026-10-10
