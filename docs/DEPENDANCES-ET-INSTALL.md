# Dépendances externes & stratégie d'installation — GEN MOTION

> **MISE À JOUR 2026-06-13** — Le P0 Chromium est implémenté :
> résolveur unifié `src/lib/chromium.ts` (env > système > cache app),
> auto-download Chrome-for-Testing via `@puppeteer/browsers` au 1er
> lancement en app packagée, binaire partagé Puppeteer + Remotion
> (`--browser-executable`), fallback Chrome système, et la copie
> `/download` ne dit plus « embarqué » mais « installé au 1er lancement ».
> Reste manuel/à configurer : voir §E (P1/P2) + le test manuel sur build réel.

> **Audit + proposition** (2026-06-13). Aucun code applicatif modifié.
> Objectif : inventaire RÉEL des dépendances externes (croisé avec le
> code : `spawn`, env vars, imports, configs Tauri), écarts avec la doc,
> et stratégie d'embarquement/automatisation dans la coque Tauri.
>
> Méthode : grep des `spawnSync/spawn/exec` et des constantes
> `*_BIN` dans `scripts/` + `src/`, lecture de `src-tauri/tauri.conf.json`,
> `src-tauri/src/lib.rs`, `scripts/desktop-fetch-binaries.mjs`,
> `scripts/desktop-prepare-standalone.mjs`.

---

## 0. TL;DR — les 3 choses à retenir

1. **🔴 Écart critique : Chromium n'est PAS embarqué.** La page
   `/download` affiche « FFmpeg & Chromium embarqués », mais le packaging
   ne bundle PAS Chromium et il n'existe aucun téléchargement au premier
   lancement. Sur une machine vierge (utilisateur qui installe le `.dmg`
   sans jamais faire `npm install`), **la capture Puppeteer et le render
   Remotion échouent**. C'est le risque n°1 avant lancement.
2. **🟢 Ce qui marche déjà bien** : Node 22, FFmpeg et ffprobe sont
   correctement bundlés en sidecars Tauri (`externalBin`) et injectés aux
   runners via env (`WEBGEN_FFMPEG_BIN` / `WEBGEN_FFPROBE_BIN` /
   `WEBGEN_RUNNERS_DIR`, posés par `lib.rs`).
3. **🟠 Capture mobile = power-user** : Maestro (+ JDK), adb (+ Android
   SDK + émulateur multi-Go) et iOS Simulator (Xcode ~7 Go) ne sont ni
   bundlables ni raisonnablement auto-installables. À traiter en
   « détecte + guide », pas en automatique.

---

## A. Inventaire réel des dépendances

### A.1 — Pipeline cœur (web : capture → voix → compose)

| Dépendance | À quoi ça sert | Résolu dans le code par | Obtention aujourd'hui | État doc |
|---|---|---|---|---|
| **Node 22.20.0** | Runtime du serveur Next standalone + des runners (`process.execPath`) | sidecar Tauri `binaries/node`, lancé par `lib.rs` | **Bundlé** (fetch via `desktop-fetch-binaries.mjs` depuis nodejs.org, par triple) | 🟠 README dit « Node ≥ 20 » (chemin dev). OK pour desktop (bundlé) mais version réelle non documentée |
| **FFmpeg** | Encode frames JPEG→MP4, mux audio, silencedetect | `WEBGEN_FFMPEG_BIN \|\| "ffmpeg"` (capture-tour, audio-tour, analyze-audio, capture-mobile) | **Bundlé** sidecar `binaries/ffmpeg` (evermeet.cx sur macOS, BtbN sur Linux/Win — **builds GPL**) ; dev = `brew install ffmpeg` | 🟠 Documenté côté dev ; **provenance + licence GPL non documentées** |
| **ffprobe** | Durées/métadonnées (compose, otio, audio-store, replace-section) | `WEBGEN_FFPROBE_BIN \|\| "ffprobe"` | **Bundlé** sidecar `binaries/ffprobe` (même vendeurs) | 🟠 Idem ffmpeg |
| **Chromium (Puppeteer)** | Filme le site section par section (`puppeteer.launch`) | `import puppeteer` → `puppeteer.launch()` **sans `executablePath` ni `channel`** | **NON bundlé.** Dev = téléchargé par `npm install` dans `~/.cache/puppeteer`. **Packaged app = absent** (`desktop-prepare-standalone` skippe `.cache`) | 🔴 **Faux dans `/download`** (« Chromium embarqué ») ; README dit « fourni au `npm install` » (vrai en dev seulement) |
| **Chrome Headless Shell (Remotion)** | Render final.mp4 (`npx remotion render`) | spawn `remotion render` **sans `--browser-executable`** | **Téléchargé au runtime par Remotion** (`ensureBrowser`) au 1er render → cache local, **réseau requis** | 🔴 Non documenté ; contredit le « 100% local / offline » |
| **ElevenLabs API** | TTS cloud (voix clonée) + alignement char-level | `fetch` api.elevenlabs.io ; clé via config/`.env` | Cloud — clé API + réseau utilisateur | 🟢 Bien documenté (README, setup wizard) |
| **Voicebox** | TTS local 100% offline (alternative) | `fetch` `http://127.0.0.1:17493` | App tierce **installée séparément** par l'utilisateur | 🟢 Documenté (lien + wizard) |

### A.2 — Capture mobile native (`platform: "ios" | "android"`)

| Dépendance | À quoi ça sert | Résolu par | Obtention | État doc |
|---|---|---|---|---|
| **Maestro** | Pilote l'app native (tapOn/swipe/inputText/launchApp) | `WEBGEN_MAESTRO_BIN \|\| "maestro"` | **Manuel** : `brew install mobile-dev-inc/tap/maestro` | 🟠 Mentionné, mais **JDK requis (Maestro = JVM) non documenté** |
| **adb** (platform-tools) | Enregistre l'écran Android + pull du fichier | `WEBGEN_ADB_BIN \|\| "adb"` | **Manuel** : Android SDK platform-tools | 🔴 Non documenté (juste « émulateur Android ») |
| **Émulateur Android + SDK + system image** | Faire tourner l'app Android à filmer | implicite (device adb « booté ») | **Manuel**, lourd (multi-Go, Android Studio / sdkmanager + AVD + accel HW) | 🔴 Non documenté |
| **xcrun simctl** (iOS Simulator) | Enregistre l'écran du simulateur iOS | `spawn "xcrun" ["simctl","io",...]` | **Manuel** : Xcode + iOS Simulator (~7 Go, macOS only) | 🔴 Non documenté comme prérequis |

### A.3 — Build / release / maintenance (pas pour l'utilisateur final)

| Dépendance | Sert à | Obtention | État doc |
|---|---|---|---|
| **Rust + Cargo + Tauri CLI** | `npm run tauri:build` (compile la coque) | Manuel (rustup) | 🔴 Non documenté comme prérequis build |
| **Xcode + xcrun notarytool/stapler** | Signature + notarisation Apple (`notarize-and-staple.mjs`) | Manuel (macOS) | 🟠 Implicite via secrets CI |
| **uuid (crate Rust)** | Token de session desktop (ajout P0 sécurité) | Cargo (transitif) | n/a |

---

## B. Écarts doc → à corriger (résumé)

1. 🔴 **`/download` ment sur « Chromium embarqué »** : soit on l'embarque/
   l'auto-télécharge réellement, soit on retire la mention.
2. 🔴 **Render Remotion = réseau au 1er compose** non documenté, et en
   tension avec l'argument marketing « 100% local / aucun cloud ».
3. 🟠 **FFmpeg/ffprobe : provenance + licence GPL** à documenter (voir §D).
4. 🟠 **Versions non figées** : Node (22.20 réel vs « ≥20 » doc), FFmpeg
   (« latest » BtbN/evermeet → non reproductible), pas de champ `engines`
   dans `package.json`.
5. 🔴 **Mobile** : JDK (Maestro), Android SDK/platform-tools/émulateur,
   Xcode/iOS Simulator — prérequis réels absents de la doc.
6. 🟠 **OS supportés flous** : `/download` = macOS 13+ only ; README =
   « Windows/Linux au prochain tag » ; mais `desktop-fetch-binaries`
   cible déjà les 4 triples. Clarifier le statut réel par OS.
7. 🟠 **Pas de section troubleshooting** (binaire introuvable, capture qui
   échoue, permissions, antivirus Windows sur binaires non signés…).

---

## C. Faisabilité d'embarquement / automatisation (contexte Tauri)

Options génériques, du plus « offline-first » au plus « manuel » :
**(1) bundler** (resource/sidecar) · **(2) auto-télécharger au 1er
lancement** (checksum + par plateforme) · **(3) détecter + guider** ·
**(4) laisser manuel**.

### C.1 — FFmpeg / ffprobe → **garder bundlé (1)** ✅
Déjà fait et c'est le bon choix (pipeline cœur, doit marcher offline).
- **Tradeoffs** : +~80 Mo/plateforme ; **licence GPL** (builds BtbN/
  evermeet) — distribués comme **exécutables séparés invoqués par
  process** (simple agrégation), ce qui est généralement compatible, mais
  **à clarifier juridiquement** vu la licence FSL de l'app (voir §D).
- **Reproductibilité** : épingler une version FFmpeg précise plutôt que
  « latest » (BtbN bouge).
- Effort : **XS** (épinglage + doc licence).

### C.2 — Chromium Puppeteer **+** navigateur Remotion → **le vrai chantier**
C'est le même besoin (un Chrome/Chromium) demandé par deux consommateurs.
Aujourd'hui : Puppeteer = rien de prévu (cassé en packaged), Remotion =
download runtime opaque. **À unifier.**

| Option | Pour | Contre |
|---|---|---|
| **(1) Bundler Chrome-for-Testing** en resource | Offline total, cohérent « local-first » | +~150–200 Mo/plateforme ; **notarisation lourde** (Chromium = des dizaines de binaires nichés à signer) ; maintenance des MAJ |
| **(2) Auto-télécharger au 1er lancement** via `@puppeteer/browsers` dans l'app-data | Bundle léger ; **checksum intégré** ; un seul Chrome partagé Puppeteer+Remotion (`executablePath` / `--browser-executable`) ; UX wizard avec barre de progression | Réseau requis au 1er run (~150 Mo) ; nuance le « 100% local » (mais 1 seule fois) |
| **(3) Détecter Chrome système** (`channel:"chrome"`) | Zéro bundle | Pas garanti présent ; drift de version ; fragile |

**Reco** : **(2) auto-download unifié** dans le wizard `/setup` —
`@puppeteer/browsers install chrome` vers un dossier app-data, puis
`PUPPETEER_EXECUTABLE_PATH` (ou `executablePath`) ET
`--browser-executable` pour Remotion pointent le **même** binaire (évite
2 × 150 Mo). Fallback (3) si un Chrome système est détecté. Garder (1)
en option « bundle offline » pour une édition « air-gapped » plus tard.
- Effort : **M–L** (install au 1er run + câblage des deux conscommateurs
  + état/erreurs réseau + maj de la copie `/download`).

### C.3 — Maestro (+ JDK) → **détecter + guider (3)** 🟠
Bundler une app JVM + son JDK est lourd et inutile sans le reste de la
chaîne mobile (SDK/Simulator). 
- **Reco** : le wizard vérifie `maestro --version` (déjà à moitié fait :
  `capture-mobile.ts` teste la présence), affiche un lien d'install + la
  dépendance JDK. Manuel assumé. Effort : **S**.

### C.4 — adb / platform-tools → **auto-download possible mais faible ROI** 🟠
platform-tools est léger (~10 Mo, zip officiel Google par OS,
checksummable) → techniquement option (2) facile. **MAIS** inutile sans
émulateur/appareil + AVD. 
- **Reco** : détecter + guider (option 3) ; auto-download platform-tools
  seulement si on veut polir l'UX Android plus tard. Effort : **S**.

### C.5 — Émulateur Android + SDK + system image → **laisser manuel (4)** 🔴
Multi-Go, dépend d'Android Studio / `sdkmanager`, AVD, accélération
matérielle (HAXM/WHPX/KVM). **Ni bundlable ni auto-installable
raisonnablement.** 
- **Reco** : franchement hors scope auto-install. Documenter comme
  « avancé : nécessite Android SDK + un AVD configuré ». Effort doc : **XS**.

### C.6 — iOS Simulator (Xcode) → **laisser manuel (4), macOS only** 🔴
Xcode (~7 Go, App Store) embarque le Simulator. Impossible à bundler/
auto-installer. 
- **Reco** : détecter (`xcrun simctl list`) + guider. Documenter
  « nécessite Xcode ». Effort doc : **XS**.

### C.7 — Rust/Tauri/Xcode (build) → **manuel, doc maintainer (4)**
Public = contributeurs uniquement. Ajouter une section « Build desktop »
(rustup, targets, Xcode CLT). Effort : **S**.

---

## D. Note licences binaires (à ne pas négliger avant distribution)

- **FFmpeg builds GPL** (BtbN/evermeet) : redistribuer un binaire GPL avec
  une app source-available FSL est généralement OK en **agrégation**
  (process séparé, pas de linking), mais impose des obligations (offre du
  source correspondant). **Option plus sûre** : utiliser un **build LGPL**
  de FFmpeg si on veut éviter les obligations GPL. À trancher avec un
  regard juridique avant le 1er `.dmg` public.
- **Chrome for Testing** : licence BSD-style de Chromium, redistribuable,
  mais respecter les mentions. L'auto-download (option 2) évite de
  redistribuer le binaire (c'est Google qui le sert) — **avantage
  juridique** en plus de l'avantage taille.
- **Node** : MIT, OK.

---

## E. Recommandation priorisée

| Prio | Action | Type | Effort |
|---|---|---|---|
| **P0** | **Régler Chromium (Puppeteer + Remotion)** : auto-download unifié `@puppeteer/browsers` au 1er lancement, 1 binaire partagé, fallback Chrome système | bundling/runtime | **M–L** |
| **P0** | Corriger la copie `/download` (« Chromium embarqué ») + clarifier « offline après 1er setup » | doc/UI | **XS** |
| **P1** | Doc d'install honnête : Node bundlé (22.x), FFmpeg provenance+licence, Chromium (téléchargé au setup), réseau requis au 1er compose | doc | **S** |
| **P1** | Épingler les versions binaires (FFmpeg, Node) + ajouter `engines` à `package.json` ; trancher GPL vs LGPL FFmpeg | build/légal | **S** |
| **P2** | Wizard mobile « détecte + guide » : checks `maestro`/`adb`/`simctl` avec liens + prérequis JDK/SDK/Xcode | UX/doc | **S–M** |
| **P2** | Section troubleshooting (binaire introuvable, antivirus Windows, permissions) | doc | **S** |
| **P3** | (optionnel) auto-download adb platform-tools ; (optionnel) édition « bundle offline » avec Chromium embarqué | bundling | **M** |
| **—** | Laisser **manuel** : émulateur Android/SDK, Xcode/iOS Simulator, toolchain Rust/Tauri build | doc | **XS** |

**Ligne directrice** : le seul bloquant produit pour un lancement macOS
est **le Chromium** (P0). Le reste est de la doc honnête (P1) et du
polish mobile (P2) — le mobile pouvant rester explicitement « avancé /
power-user » sans nuire au cœur web.

---

## F. Annexe — preuves (références code)

- Sidecars bundlés : `src-tauri/tauri.conf.json` → `externalBin: [binaries/node, binaries/ffmpeg, binaries/ffprobe]`, `resources: [standalone/**, runners/**]`.
- Injection env : `src-tauri/src/lib.rs` → `.env("WEBGEN_FFMPEG_BIN"...)`, `.env("WEBGEN_FFPROBE_BIN"...)`, `.env("WEBGEN_RUNNERS_DIR"...)`.
- Fetch binaires : `scripts/desktop-fetch-binaries.mjs` (Node nodejs.org ; FFmpeg evermeet.cx / BtbN ; **pas de Chromium**).
- Chromium non copié : `scripts/desktop-prepare-standalone.mjs` → commentaire « Skip .cache (puppeteer browser cache lives elsewhere) ».
- Puppeteer sans executablePath : `scripts/capture-tour.ts:209`, `scripts/agent-generate-tour.ts:211`.
- Remotion sans `--browser-executable` : `scripts/compose-tour.ts` (spawn render).
- Binaires mobiles : `scripts/capture-mobile.ts` → `FFMPEG_BIN`, `MAESTRO_BIN`, `ADB_BIN`, `xcrun simctl`.
- Claim `/download` : `src/app/download/page.tsx:19` « FFmpeg & Chromium embarqués ».

---

## G. Versions épinglées (relevé réel, 2026-06-13)

> Croisé depuis `package.json`, `scripts/desktop-fetch-binaries.mjs`,
> `src-tauri/Cargo.toml`, `node_modules/@puppeteer/browsers/package.json`.

### G.1 — Binaires bundlés / téléchargés

| Composant | Version réelle | Source | Épinglé ? |
|---|---|---|---|
| **Node** (sidecar) | **v22.20.0** | `desktop-fetch-binaries.mjs` → nodejs.org | ✅ figée |
| **FFmpeg / ffprobe** (sidecar macOS) | **release courante** evermeet.cx (`getrelease`) | evermeet.cx | 🔴 **non épinglé** (suit la dernière release) |
| **FFmpeg / ffprobe** (sidecar Linux/Win) | **`master-latest`** BtbN (variante **`-gpl`**) | github.com/BtbN/FFmpeg-Builds | 🔴 **non épinglé** (build roulant) |
| **Chrome for Testing** (téléchargé 1er lancement) | canal **`stable`**, buildId résolu au runtime | `@puppeteer/browsers` | 🔴 **non épinglé** (= dernier stable au moment du 1er lancement) |
| **Chromium dev** (poste contributeur) | celui de **Puppeteer 24.x** | `npm install` → `~/.cache/puppeteer` | 🟠 suit `puppeteer ^24.43.0` |

### G.2 — Dépendances applicatives (extraits `package.json`)

| Paquet | Version | Rôle |
|---|---|---|
| `next` | **16.2.6** | Frontend / serveur standalone |
| `react` / `react-dom` | **19.2.4** | UI |
| `remotion` / `@remotion/cli` | **^4.0.459** | Compositeur final.mp4 |
| `puppeteer` | **^24.43.0** | Capture E2E |
| `@puppeteer/browsers` | **2.13.1** (transitif) | Téléchargement Chrome-for-Testing (P0) |
| `three` | **^0.184.0** | Frames 3D (Studio) |
| `stripe` | **^22.1.1** | Checkout |
| `tailwindcss` | **4.x** · `typescript` **5.x** · `vitest` **^4.1.8** | Build / styles / tests |

### G.3 — Coque desktop (`src-tauri/`)

| Composant | Version | Note |
|---|---|---|
| `@tauri-apps/cli` / `@tauri-apps/api` | **^2.11.1 / ^2.11.0** | Tauri 2 |
| crate `tauri` / `tauri-plugin-shell` | **2** | Shell Rust + sidecars |
| crate `uuid` | **1** (feature `v4`) | Token session desktop (P0 sécurité) |
| **Rust** | `rust-version = "1.77"`, edition 2021 | Toolchain mini pour builder |

### G.4 — Prérequis OS (utilisateur final)

| OS | Statut réel | Minimum |
|---|---|---|
| **macOS** | ✅ Cible prête (`.dmg` signé + notarisé) | **macOS 13 Ventura+**, Apple Silicon ou Intel 64-bit, 8 Go RAM (16 reco) |
| **Windows** | 🟠 Binaires fetchés (`x86_64-pc-windows-msvc`) mais **pas encore taggé/distribué** | Win64 (à valider) |
| **Linux** | 🟠 Binaires fetchés (`x86_64-unknown-linux-gnu`) mais **pas encore taggé/distribué** | x86_64 (à valider) |

**Disque** (ordre de grandeur) : app ~150–250 Mo + FFmpeg ~80 Mo (bundlé) +
**Chromium ~150–170 Mo téléchargé au 1er lancement** + caches `~/.webgen-motion/`
(captures/voix/renders) qui grossissent avec l'usage. Prévoir **~1 Go** confortable.

### G.5 — Recommandations d'épinglage (réduire le risque supply-chain)

1. 🔴 **FFmpeg** : remplacer `latest` (BtbN) / `getrelease` (evermeet) par une
   **version précise** + **checksum SHA-256** enregistré, pour des builds
   reproductibles et auditables.
2. 🟠 **Chrome for Testing** : si la reproductibilité compte, épingler un
   `buildId` explicite dans `ensureChromium()` plutôt que `stable`.
3. 🟠 Ajouter un champ **`engines`** à `package.json` (`"node": ">=20"`) pour
   refléter le minimum dev.

---

## H. Verdict licence FFmpeg (⚠ pas un conseil juridique — à confirmer par un juriste)

### H.1 — Ce qui est réellement bundlé

- **macOS** : build **evermeet.cx** (`getrelease`) → compilée avec
  `--enable-gpl` (inclut x264/x265) ⇒ **GPL** (v3).
- **Linux / Windows** : build **BtbN FFmpeg-Builds**, variante explicitement
  **`-gpl`** (`ffmpeg-master-latest-{linux64,win64}-gpl`) ⇒ **GPL** (v3).
- Le pipeline encode en **`libx264`** (`-c:v libx264` dans `capture-tour.ts` et
  `capture-mobile.ts`). **libx264 est GPL** : c'est une dépendance dure.

**Verdict : la distribution embarque aujourd'hui du FFmpeg sous licence GPL,
et le code en dépend (libx264).**

### H.2 — Implication pour une distribution commerciale

- FFmpeg est invoqué **comme process séparé** (`spawn`), pas lié dans le
  binaire de l'app ⇒ **agrégation** : l'app GEN MOTION garde sa licence FSL,
  elle ne « devient » pas GPL.
- **MAIS** distribuer un binaire GPL impose des obligations sur **ce binaire** :
  fournir / offrir la **source correspondante** de la build exacte, inclure le
  **texte de licence GPL**, et ne pas ajouter de restrictions sur le binaire
  FFmpeg lui-même.

### H.3 — Reco actionnable (deux voies)

- **Voie A — rester GPL, se mettre en conformité (effort faible, recommandé court terme)**
  1. Inclure le **texte GPL** + un fichier `THIRD-PARTY-LICENSES` dans l'app/le `.dmg`.
  2. Fournir un **lien / offre écrite** vers la source correspondante de la build
     FFmpeg exacte (evermeet / BtbN publient leurs scripts de build).
  3. **Épingler** la version FFmpeg (cf. G.5) pour que « la source correspondante »
     soit identifiable sans ambiguïté.
- **Voie B — passer LGPL (plus permissif, mais = changement de CODE, hors de cette doc)**
  - Bundler la variante **`-lgpl`** de BtbN (existe) ⇒ **mais elle n'a pas
    libx264** : il faudrait remplacer l'encodeur H.264 par un encodeur
    **non-GPL par plateforme** : `h264_videotoolbox` (macOS, matériel),
    `h264_mf` (Windows MediaFoundation), `vaapi`/`nvenc` (Linux), ou
    `libopenh264` (attention brevets). C'est une modif des args ffmpeg + tests
    qualité par plateforme. **À planifier comme chantier dédié**, pas un simple
    swap de binaire.

**Reco synthèse** : **Voie A maintenant** (conformité GPL : textes de licence +
offre de source + épinglage version) — c'est rapide et lève le risque immédiat.
**Voie B** à évaluer ensuite si on veut alléger les obligations, en sachant que
c'est un chantier code multi-plateforme. **Faire valider par un juriste avant le
premier `.dmg` vendu.**
