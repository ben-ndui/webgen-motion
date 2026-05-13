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

### Added (Sprint 5 — Agent IA auto-tour generation) · 2026-05-13

- **Provider abstraction** (`src/lib/llm-providers/{base,anthropic,prompt,index}.ts`) : interface `AgentProvider` commune, implémentation Anthropic Claude via fetch direct (Sonnet 4.6 par défaut, Opus + Haiku supportés). Pricing intégré pour cost estimation. Multimodal (image_block) pour Claude.
- **Setup wizard tab Agent IA** (`/setup/agent`) : provider selector, sélection modèle avec pricing visible, clé API masquée stockée dans `~/.webgen-motion/config.json`.
- **Site scraper Puppeteer** (`scripts/agent-generate-tour.ts`) : navigation + scroll-prefetch, extraction sections (`data-tour-section` / `data-section` / sémantique `<section>` avec heading) avec **scrollY pixel exact** capturé, éléments interactifs, screenshot full-page JPEG capé à 7800px (sous la limite Claude 8000).
- **API route streaming NDJSON** (`/api/motion/tour/generate/run`) : POST baseUrl + outputId + preset (pitch / demo / walkthrough / showcase) + tone + format. Pre-validation creds, forward stderr du runner.
- **UI "Générer avec IA"** dans le `/dashboard` : bouton + modale avec URL / slug auto / preset / tone / format / skip-screenshot, streaming live des phases, navigate vers `/tour/<id>` à la fin.
- **Filets de sécurité programmatiques** (`base.ts`) :
  - `normalizeStepOrder` — réordonne `scroll → section` en `section → scroll` (le scroll appartient au MP4 de la section qu'il introduit, pas celui d'avant).
  - `realignScrollsToSnapshot` — pour chaque section, fuzzy-match son titre vs les headings du snapshot, force le `scroll.to` sur le vrai scrollY, **INSÈRE un scroll si manquant** (sans ça les MP4 stagnent et caption désynchronise du visuel).
- **Prompt engineering** (`prompt.ts`) : schéma TourEntry inline avec tous les types de steps (`section`, `scroll`, `overlay`, `wait`, etc.), force `voiceMode: "narrative"` avec markers `[step:N]`, anti-pattern interdit + pattern obligatoire montrés côte à côte avec exemples concrets.

### Fixed (itérations Sprint 5)

- Schéma agent → vrai TourEntry : `label`/`ms`/`category` étaient les mauvais noms, fixés en `text`/`dwellMs`/`categoryId`.
- `voiceMode: "narrative"` obligatoire pour éviter le crash audio-tour exit code 1 quand les VO per-step ne matchaient pas la durée.
- Bug zoom captures : `useState` déplacé dans `CaptureResults` (où le lightbox vit), pas `CaptureTab`.
- Screenshot Puppeteer capé à 7800px (Claude rejette > 8000).
- Overflow modal d'erreurs : `break-all` + `min-w-0` + `max-h-40 overflow-y-auto`.
- `__name` shim Puppeteer (tsx/esbuild wrapper) via `evaluateOnNewDocument`.
- Off-by-one numérique LLM : safety net programmatique override les valeurs scroll avec celles du snapshot par fuzzy match.

---

### Added (Sprint UX post-capture) · 2026-05-13

- **Recapture section** : `capture-tour --only-section N` patche le manifest sans wipe, API `/api/motion/tour/recapture/run`, composant `RecaptureSectionButton`. Divise par ~7 le temps d'itération quand l'agent IA produit un tour imparfait.
- **Drag-and-drop reorder** : drag handle sur chaque card, API `/api/motion/tour/reorder-sections/run` qui valide la permutation et réécrit le manifest. Native HTML5 D&D, zero dep externe.
- **Trim in/out non-destructif** : dual-range slider (CSS-only) avec live seek preview, API `/api/motion/tour/trim-section/run`. Les MP4 restent intacts — compose-tour applique le trim via `OffthreadVideo startFrom + endAt`. Reset = restore full clip.
- **Upload custom MP4** : remplace une section par un fichier perso (B-roll, screen recording externe, etc.). API `/api/motion/tour/replace-section/run` multipart + ffprobe pour récupérer la durée et patcher le manifest.
- **Lightbox liquid-glass** : fullscreen viewer des captures avec les 4 actions accessibles en pill design backdrop.
- Extraction `section-card.tsx` + `section-lightbox.tsx` depuis `capture-tab.tsx` (377 → 287 lignes).

### Added (Sprint refactor wizard) · 2026-05-13

- Extraction des 6 step components inline de `/setup/page.tsx` (1018 → 329 lignes) dans `_components/wizard-<step>-step.tsx` + types partagés dans `wizard-types.ts`.
- **Convention `data-wm-id`** : 52 attributs ajoutés sur les éléments significatifs (wizard + dashboard + tour tabs + notary + setup/agent) pour tour-ability future via l'Agent IA.

### Added (Sprint 6 — Extraction Motion Studio standalone) · 2026-05-13

- **Project scaffolder** (`scripts/scaffold-tours-from-project.ts`) : scanne un repo Next.js cible (App Router ou Pages Router), extrait routes + headings, émet un fichier tour squelette par route dans `<projectPath>/tours-scaffold/`. CLI + API `/api/motion/tour/scaffold-from-project/run` + bouton modal dashboard "Scaffold projet".
- **Open-core foundation** : `webgen-motion.config.ts` au root avec champ `edition` (community / studio / enterprise) + `src/lib/edition.ts` qui expose `isFeatureEnabled(flag)`. 23 feature flags définis (10 Community actifs, 8 Studio gated, 5 Enterprise gated). Architecture en place pour le tiering Davinci-style sans refactor futur.
- **Brand rename** : `src/lib/brand.ts` exporte `BRAND` (ex-`UZME`, transitionnel — personne ne l'importait).
- **README** réécrit pour adoption externe : section "Trois façons de créer un tour" (manuel / Agent IA / Scaffold projet) + section "Editions" qui documente le tiering Community/Studio/Enterprise et son architecture.

---

### Added (Sprint 7 phase 1 — Frames 3D R3F) · 2026-05-13

- **Devices procéduraux** (`remotion/three/`) :
  - `iPhoneDevice.tsx` : silhouette iPhone 15 Pro via `ExtrudeGeometry` (rounded shape) + screen plane avec `useOffthreadVideoTexture` + glass overlay + Dynamic Island. Material titanium PBR (`metalness 0.7`, `roughness 0.45`).
  - `MacBookDevice.tsx` : base aluminium + hinge à 100° (angle laptop ouvert réaliste) + écran 16:10 + notch + trackpad.
- **Camera presets** (`remotion/three/camera-presets.ts`) : 5 animations cinematic (`hero-tilt`, `feature-zoom`, `pan-right`, `flip-reveal`, `static-front`) avec easing cubique. Camera distance optimisée pour cadrer correctement les devices à FoV 36°.
- **Scene wrapper** (`remotion/three/SceneCanvas.tsx`) : `ThreeCanvas` avec lighting 3-points + ambient boosté pour SwiftShader software rendering. Canvas transparent — le 3D flotte par-dessus le compositor backdrop existant (BeatsLayer, transitions, motion design), pas de fond plein.
- **Integration SectionPlayer** : prop `frame3d?` + `cameraPreset3d?`. Quand set + feature flag `frames-3d` actif → render `SceneCanvas` au lieu du Mac chrome / iPhone frame 2D.
- **Compose-tour gating** : `isFeatureEnabled('frames-3d')` check serveur avant de propager les props à Remotion. Community Edition fallback silencieux sur 2D, log info pour le dev.
- **UI Compose tab** (`frame3d-selector.tsx`) : 3 boutons pill (2D default / iPhone 3D / MacBook 3D) avec lock badge ambre sur les options Studio quand Community. Dropdown camera preset visible quand 3D actif. `/api/motion/config` retourne `edition` pour le gating client.
- **Remotion flag `--gl=angle`** dans compose-tour quand frame3d actif (Chromium headless SwiftShader software rendering pour WebGL sans GPU).
- **TourEntry** étendu avec `frame3d?: "iphone" | "macbook"` et `cameraPreset3d?: ...`.

Test end-to-end validé : `notary-3d-test` tour 9:16 avec iPhone hero-tilt rendu en 30s → final.mp4 1.2 MB, device procédural visible flottant sur backdrop catégorie + transitions.

### Backlog (Sprint 7 phase 2)

- Real GLBs iPhone 15 Pro + MacBook Air/Pro (Sketchfab ou achat).
- Environment HDRI studio pour reflections vraies (vs lighting basique software).
- Post-process : bloom, AO, color grading.
- Multi-device scene preset (phone + mac côte à côte).

---

**À venir** :
- **Sprint 7 phase 2** — Polish 3D (GLBs réels + HDRI + post-process).
- **Notarization Apple** — relance la submission avec le bundle pruné (.dmg ~300 MB au lieu de 546).
- **License key offline-first** — vérification crypto locale qui débloque Studio Edition. Pré-requis pour la commercialisation.
