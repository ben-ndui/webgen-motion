# Changelog

Toutes les évolutions notables de **webgen-motion** sont consignées ici.

Format : [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ·
Versioning : [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

La cible `v0.2.0` est la première version distribuable publiquement (`.dmg`
macOS signé + notarized). Tout ce qui est sous _Unreleased_ atterrira
dans cette tag dès qu'Apple aura validé la notarization.

## [Unreleased]

### Added

#### Desktop (Tauri 2 native)

- **Stage 1** — coque Tauri 2 (Rust shell + WebView native macOS / Windows / Linux). Window 1400×900, identifier `fr.smoothandesign.webgen-motion`, dev URL pointée sur le Next dev server (port 3030 pour éviter les conflits Arc / autres).
- **Stage 2** — sidecar Node injecté en production : le Rust shell spawn le bundle Next.js standalone (`.next/standalone/server.js`) et attend l'ouverture du port avant d'afficher la window. Kill propre du child à la fermeture pour éviter les Node zombies.
- **Stage 3** — externalisation des runners. Le bundle est passé de **2,4 GB → 1,2 GB** via `outputFileTracingExcludes` (Puppeteer / Remotion / dev deps) + pin de `outputFileTracingRoot`. Scripts + node_modules stagés dans `src-tauri/runners/` séparément du standalone Next.
- **Stage 4** — sidecars Node 22.20 + ffmpeg + ffprobe bundlés. Plus aucune dépendance système requise. Premier `.dmg` shippable (507 MB sur arm64) avec capture + audio (ElevenLabs / Voicebox) + compose Remotion validés end-to-end.
- **Stage 5** — signing macOS + notarization wiring + bundle prune. Reconnait `APPLE_SIGNING_IDENTITY` / `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` depuis l'env, signe récursivement tous les Mach-O nested (incluant `.bare`, symlinks `.bin/*`, esbuild, Remotion compositor, fsevents), embarque les entitlements hardened runtime pour Chromium JIT + sidecars. Prune `next/`, `@next/`, `react-icons/`, `@rspack/`, `typescript/`, etc. depuis le node_modules des runners : ~648 MB libérés.
- **CI multi-OS** — workflow `.github/workflows/desktop-release.yml` (matrix macos-14 / macos-13 / windows-latest / ubuntu-22.04, déclenchement sur tag `v*` ou manuel, publication en draft release via `tauri-apps/tauri-action`).

#### Notary dashboard

- Page `/notary` éditoriale (DA noire/blanche, sections numérotées, animations subtiles) qui liste les soumissions Apple Notary Service en temps réel.
- API routes `/api/motion/notary/{history,log/[id]}` qui wrap `xcrun notarytool`.
- Auto-refresh 30 s tant qu'au moins une soumission est In Progress. Click sur Invalid → expand avec le log Apple détaillé per-binary.
- Lien dans le header du dashboard `/`.

#### Pipeline motion

- **Sprint 1** — scaffold Next 16 App Router, design tokens slate, hub `/`, migration des runners scripts + API routes depuis l'ancien repo `uzme-support`.
- **Sprint 2** — orchestrator `TourClient.tsx` + 5 tabs state-based (Script / Capture / Audio / Voix off / Compose), streaming NDJSON pour les 3 runners, auto-load au mount.
- **Sprint 3** — Setup wizard + `~/.webgen-motion/config.json`, scaffolder `npx create-webgen-motion`, meta-demo tour, ROADMAP compilé.
- **Sprint 4-x** — visual tour editor dans le Script tab, live preview sans re-capture, audio-tour en mode narratif (un VO continu + alignement marker-driven), tour-aware compose stage (intro / outro / URL bar).
- **Compose v2 cutover** — Remotion devient l'unique chemin compose. 4 style presets (sober / energetic / cinematic / glitch). Ken Burns sur le device frame, 5 transitions par catégorie, backdrop motion, beats + VO-pause reactive visual layer, audio analysis + pacing trim (désactivé par défaut pour éviter le désync VO).
- **Voicebox local TTS** — backend choice ElevenLabs cloud / Voicebox local (A1.0), profils auto-découverts via dropdown (A1.0+), Setup wizard Backend step (A1.2), SSE consumption pour `/generate/{id}/status`.
- **Tours catalogue** — `webgen-motion-pitch` (80s narrative Energetic), `uzme-landing`, `uzme-landing-portrait`. Quick actions menu (Delete) sur les cards du hub.

#### Landing & marketing

- Landing root `/` rebuildée en DA editoriale noire/blanche (`smoothandesign.fr` style) — section numérotées, asymétrie, layout responsive, embed `public/demo.mp4` (le pitch officiel rendu).
- README marketing rewrité avec badges, demo block, presets showcase.

### Changed

- Hub déplacé de `/` à `/dashboard` pour libérer la landing.
- Always-visible Save button dans la top bar des tours.

### Fixed

- Plein de fixes compose-v2 (black frame flash, Sequence wrapping, video crop anchor top, pacing trim désync VO).
- Voicebox `/generate/{id}/status` est SSE, pas JSON polling.
- Pronunciation map vidée — ElevenLabs gère le FR naturel sans hints.
- Sidecar paths Rust : `current_exe().parent()` au lieu de `BaseDirectory::Resource` (Tauri strip le suffixe-triple au bundling).
- Runner spawn packaged : abandon de `npx` (PATH non hérité dans `.app` macOS) → `process.execPath` + chemin explicite vers `tsx/dist/cli.mjs`.
- Compose-tour subspawns (analyze-audio + remotion render) : canonical CLI scripts au lieu des symlinks `.bin/*` qui cassent la résolution de modules dans le bundle.

---

**À venir (Sprint 5)** : Agent IA d'auto-tour generation. Setup wizard tab "Agent IA" + provider abstraction (Anthropic / OpenAI / Mistral) + bouton "Générer avec IA" qui fetch un site, parse les `data-*` attrs / structure sémantique, et génère un `TourEntry` complet via LLM. Bring-your-own-key. Multimodal bonus (Claude Opus + screenshot) pour qualité narrative.
