# Changelog

Toutes les évolutions notables de **webgen-motion** sont consignées ici.

Format : [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ·
Versioning : [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

La cible `v0.2.0` est la première version distribuable publiquement (`.dmg`
macOS signé + notarized). Tout ce qui est sous _Unreleased_ atterrira
dans cette tag dès qu'Apple aura validé la notarization.

## [Unreleased]

(rien pour l'instant — Sprint 7 vient de fermer, prochaine ouverture quand on s'attaque à la notarization Apple ou au license key offline-first)

---

## [0.1.7] — 2026-05-17

Sprint 7 closure (phases 1-3). Studio Edition débloque les **frames
3D** : iPhone / MacBook procéduraux (R3F + @remotion/three) avec HDRI
studio, post-process, 6 camera presets dont `cinematic-spin` (device
qui danse, camera fixe), GLB loader optionnel pour upgrade Sketchfab,
UI Settings de gestion des modèles. Brand UI passe à `GEN MOTION`
(slug repo + paths `~/.webgen-motion/` inchangés).

> ⚠️ **Phase 4 — Duo multi-device preset** : implémenté + commit
> e82570f puis **revert 6f0e8fd** suite à un test visuel end-to-end
> qui a révélé 2 bugs latents pré-existants (MacBookDevice screen
> orientation + cinematic-spin comportement) jamais visuellement
> validés en phase 1 (qui ne testait que iPhone + hero-tilt). Duo
> + polish 3D reporté à Sprint 8 avec test visuel obligatoire
> avant merge. Cf. section "À venir" + entrée `agent/decisions.md`
> du smooth-brain.

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

### Added (Sprint 7 phase 2 — HDRI studio + post-process) · 2026-05-13

- **HDRI environment** (`SceneCanvas.tsx`) : `<Environment preset="apartment" background={false}>` de drei pour des reflections vraies sur le titanium frame + glass screen. Le HDRI ne contribue PAS au render direct du fond (canvas transparent conservé) — seulement aux matériaux PBR du device.
- **Post-process chain** (`@react-three/postprocessing`) : `Bloom` (intensity 0.2, luminanceThreshold 0.92) pour faire luire les vraies highlights sans cramer les edges, `BrightnessContrast` (+0.05 contrast pour compenser le software rendering SwiftShader), `Vignette` subtle (offset 0.25, darkness 0.45) pour cadrer l'attention.
- **Lighting plus chaleureux** : ambient boosté à 0.5 + 3 directionalLights (1.8 / 0.8 / 0.6) pour compenser le HDRI background absent.
- **Détails procéduraux enrichis** : iPhone gagne dynamic Island + camera bump dos (plateau + 3 lentilles + LiDAR) + boutons latéraux (power / volume up/down). MacBook gagne trackpad + keyboard area + grille 5×15 de touches + 3 ports USB-C latéraux + notch.
- `ForceTransparentBackground` helper qui set `scene.background = null` — drei `background={false}` n'est pas toujours respecté par SwiftShader, fix manuel obligatoire.

### Added (Sprint 7 phase 3 — GLB loader + UI Settings + cinematic-spin) · 2026-05-13 → 2026-05-14

- **GLB loader optionnel** (`GLBDevice.tsx`) : drop un modèle Sketchfab dans `public/models/iphone.glb` ou `public/models/macbook.glb` → compose-tour détecte, le stage dans `.remotion-public/models/` et SceneCanvas le rend à la place du procédural. Suspense fallback pendant le load. Heuristique multi-mesh pour détecter l'écran (mesh nommée `screen`/`display`/`écran`/`ecran`), auto-flip Y si elle atterrit derrière la caméra, auto-orient le GLB par bbox.
- **UI gestion models 3D** (`/setup/models`) : upload GLB (max 100 MB), preview thumbnail, suppression, list avec role (iphone/macbook/other). API routes `/api/motion/models/{upload,list,delete}`. Dropdown Settings consolidé dans l'appbar — accès rapide aux GLBs depuis le dashboard.
- **Preset `cinematic-spin`** (`camera-presets.ts`) : chorégraphie 4 temps avec camera statique reculée (z=9) + device qui danse face → 3/4 droite → drift → 3/4 gauche → settle. Camera fixe, ce sont `deviceRotation` + `devicePosition` qui animent. Amplitudes conservatrices après 2 passes de tuning (rotY ±0.35, posX ±0.3) pour rester dans le frustum.
- Bouton "Cinematic spin" en premier dans le dropdown camera preset du Compose tab.

### Fixed (types — Sprint 7 phase 3 oversight) · 2026-05-17

- **`TourEntry.cameraPreset3d`** étendu avec `"cinematic-spin"` (le preset existait dans `camera-presets.ts` et dans le selector UI mais le type tour ne l'acceptait pas → mismatch typecheck dans `frame3d-selector.tsx`). Bundlé à l'origine dans le commit duo, isolé en commit `f160cc4` après revert duo.

### Changed (Rebrand UI → GEN MOTION + durations human-readable) · 2026-05-14

- Le wordmark UI dans le dashboard + l'appbar + le launch screen passe à **GEN MOTION** (Geist Mono caps). Le slug du repo (`webgen-motion`), le storage path (`~/.webgen-motion/`), les noms d'API routes et l'identifier Tauri (`fr.smoothandesign.webgen-motion`) restent inchangés — rebrand visuel pur.
- Durations dans les section cards passent en format human-readable (ex: "1m 23s" au lieu de "83.42s") via helper centralisé.

### Fixed (Sprint 7 polish 3D) · 2026-05-13 → 2026-05-14

- **GLB auto-orient par bbox** : certains GLBs Sketchfab arrivent rotated arbitrairement (vertical, latéral, à l'envers). On compute la bounding-box, on aligne le plus grand axe vertical + on snap face caméra.
- **GLB auto-flip si screen mesh derrière la caméra** : après auto-orient, si la mesh `screen` est sur le Z négatif on flip 180° pour faire face. Sinon on rend le derrière du device.
- **Détection mesh screen élargie** : matche `screen` | `display` | `écran` | `ecran` (case-insensitive). Multi-mesh texture mapping si plusieurs candidats.
- **Camera hero-tilt en 3/4** : décalée X=+1.2 (vs 0) pour un angle dynamique style Apple Keynote (vs full-front qui paraît figé).
- **Ken Burns CSS disabled quand frame3d actif** : la scène a déjà sa propre animation camera/device, le Ken Burns CSS par-dessus créait un double mouvement qui faisait sortir le device du cadre.
- **cinematic-spin amplitude réduite × 2 passes** : amplitude initiale 0.5/0.4 trop violente, settled à 0.35/0.3 puis 0.35/0.3 + camera reculée z=9 pour garder le device cadré pendant les 4 phases.
- **Appbar nettoyé + 3 bugs visuels 3D** (ffbq849) : icônes alignées, padding cohérent, dropdown z-index fixé.
- **GLBs uploadés au bon path** : conventions normalisées (`public/models/<role>.glb`), staging Remotion publicDir auto.
- **Restore switch preset** : un commit antérieur avait sauté le `<switch>` du preset selector, réintégré (c0c7448).

### Fixed (build) · 2026-05-17

- `mkdtempSync` importé depuis `node:os` (n'existe pas là) → déplacé vers `node:fs` (`replace-section/run/route.ts`).
- `motion` utilisé dans `capture-tab.tsx` sans être importé de `framer-motion` → ajout à l'import existant à côté de `AnimatePresence`.
- Build local clean restauré (`npm run build` passe sans TS error).

### Known Issues — Frames 3D (Beta) · 2026-05-17

> ⚠️ **Les frames 3D sont en preview expérimental.** Après diagnostic exhaustif Sprint 8 (15+ renders, 10+ frames analysées sur `notary-scaffolded` + `notary-3d-test`), les bugs visuels suivants restent non résolus :

- **iPhone rotation parasite** — l'iPhone se présente edge-on (90° autour de Y) ou rotated 90° autour de Z à certains timestamps/sections selon un pattern non-déterministe. Le bug se produit indépendamment du `cameraPreset3d` (testé avec `static-front` qui n'applique AUCUNE rotation device → bug présent), du `composeStyle` (testé avec `sober` qui force `fade` transition partout → bug présent), et du nombre de sections (testé sur tour mono-section → bug présent à certains frames).
- **MacBook screen orientation inverse** — après la rotation hinge `-(Math.PI - openAngle)`, la face avec la video texture pointe vers -Y/-Z. La camera voit le BACK aluminium au lieu du screen avec contenu. Bug systématique (pas frame-dependent).

**Hypothèse résiduelle** : interaction Remotion + @remotion/three + R3F où le state du Three.js scene leak entre frames, ou `useOffthreadVideoTexture` force un re-render avec une orientation différente. Investigation poussée requise (instrumenter le code Three.js, repro minimal hors Remotion, lire les internals de @remotion/three).

**Path validé visuellement** : `frame3d: "iphone"` + `cameraPreset3d: "hero-tilt"` sur tour **mono-section** à certains timestamps (notamment au début de la section). C'est ce que le CHANGELOG Sprint 7 phase 1 testait. Toute autre combinaison peut produire des artefacts.

**UI** : badge `3D Beta` ajouté sur `Frame3DSelector` + tooltip sur chaque option 3D pour avertir l'utilisateur. Recommandation par défaut = frames 2D (Mac chrome / iPhone frame natifs) pour usage production.

---

## [Unreleased précédent — historique cumulé pré-0.1.7]

(Tout ce qui suit était sous Unreleased avant le tag v0.1.7. Conservé tel quel pour traçabilité.)

**À venir (re-priorisé 2026-05-17 après diagnostic Sprint 8)** :
- **Notarization Apple** — relance la submission avec le bundle pruné (.dmg ~300 MB au lieu de 546). **Priorité 1 désormais** — bloque le tag v0.2.0 (première version distribuable publique).
- **License key offline-first** — vérification crypto locale qui débloque Studio Edition. Pré-requis pour la commercialisation.
- **Frames 3D polish (deferred)** — diagnostic Sprint 8 (15+ renders) n'a pas isolé la root cause des rotations parasites iPhone/MacBook. Tous les paths obvious éliminés (preset, transition, composeStyle, section count). Hypothèse résiduelle : interaction Remotion+@remotion/three+R3F internals. À reprendre quand on aura un budget temps dédié OU un repro minimal hors Remotion. En attendant 3D = beta documentée UI (badge `3D Beta` + tooltips). Duo phase 4 deferred avec.
