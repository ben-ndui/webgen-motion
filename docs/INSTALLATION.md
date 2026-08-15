# Installation & prérequis — GEN MOTION

> Guide honnête : ce qui est vraiment requis, ce qui se télécharge tout
> seul, et ce qui reste à votre charge. Deux publics : **utilisateur final**
> (installe le `.dmg`) et **développeur / builder** (clone + build).
>
> Détail des versions exactes et licences : `docs/DEPENDANCES-ET-INSTALL.md`.

---

## 1. Utilisateur final (app desktop)

### 1.1 — Configuration requise

| | |
|---|---|
| **OS** | macOS **13 Ventura** ou supérieur |
| **CPU** | Apple Silicon (arm64) ou Intel 64-bit |
| **RAM** | 8 Go minimum, 16 Go recommandé (le render Remotion + Chromium consomment) |
| **Disque** | Prévoir **~1 Go** : app + FFmpeg embarqué + **Chromium téléchargé au 1er lancement** + caches captures/voix/renders |
| **Réseau** | Requis **une fois** au 1er lancement (téléchargement de Chromium ~150–170 Mo) et pour la voix off **ElevenLabs** (cloud). Sinon, tout est local. |

> **Windows / Linux** : pas encore distribués officiellement (voir §4 matrice OS).

### 1.2 — Installer

1. Télécharger le `.dmg` macOS arm64 : **[genmotion.app/download](https://genmotion.app/download)** (signé + notarisé Apple).
2. Double-clic → glisser **GEN MOTION** dans **Applications**.
3. Lancer l'app → le wizard **/setup** vous guide.

### 1.3 — Ce qui se passe au premier lancement

- **FFmpeg / ffprobe** : déjà **embarqués** dans l'app (rien à faire).
- **Node** : embarqué (sidecar).
- **Chromium** : **téléchargé automatiquement** au 1er besoin (capture ou
  compose) si aucun Chrome système n'est détecté. Stocké dans
  `~/.webgen-motion/browsers`. Un Google Chrome déjà installé est réutilisé
  (pas de téléchargement). *(Vous pouvez forcer un binaire précis via la
  variable d'env `WEBGEN_CHROMIUM_BIN`.)*
- **Voix off** : à configurer dans le wizard —
  - **ElevenLabs** (cloud) : clé API + voice ID (voix clonée). Réseau requis.
  - **Voicebox** (local, 100% offline) : installer
    [Voicebox desktop](https://github.com/jamiepine/voicebox) séparément.

### 1.4 — Stockage local

Tout vit sous `~/.webgen-motion/` : `config.json` (réglages, **chmod 0600**),
`audio/`, `vo-cache/`, `browsers/` (Chromium), `tours/<id>/` (captures, voix,
`final.mp4`). Rien n'est envoyé au cloud par le pipeline.

---

## 2. Capture mobile native (avancé / power-user)

Optionnelle, pour les tours `platform: "ios" | "android"`. **Non automatisée** —
ces outils sont trop lourds / liés aux SDK officiels pour être embarqués.

| Plateforme | À installer soi-même | Pourquoi |
|---|---|---|
| **iOS** | **Xcode** (~7 Go, App Store) + iOS Simulator | `xcrun simctl` enregistre l'écran du simulateur. macOS uniquement. |
| **Android** | **Android SDK platform-tools** (`adb`) + un **émulateur/AVD** (Android Studio) + image système | `adb` enregistre l'écran ; l'émulateur fait tourner l'app. Multi-Go. |
| **Les deux** | **Maestro** (`brew install mobile-dev-inc/tap/maestro`) + **un JDK** (Maestro tourne sur la JVM) | Pilote l'app (tap/swipe/inputText). |

Overrides d'env : `WEBGEN_MAESTRO_BIN`, `WEBGEN_ADB_BIN`, `WEBGEN_FFMPEG_BIN`.

> Franchement : la capture Android exige le **SDK Android complet + un AVD
> configuré** (accélération matérielle incluse). C'est une fonctionnalité
> power-user, pas un parcours grand public.

---

## 3. Développeur / builder (clone + source)

### 3.1 — Prérequis dev

- **Node ≥ 20** (le projet bundle Node **22.20.0** pour le desktop ; 22 LTS recommandé en dev).
- **FFmpeg** sur le PATH : `brew install ffmpeg` (macOS) / `apt install ffmpeg` (Linux).
- **Chromium** : téléchargé par Puppeteer au premier `npm install` (cache `~/.cache/puppeteer`). En dev, aucune action — c'est ce cache qui sert.

```bash
git clone https://github.com/ben-ndui/webgen-motion.git
cd webgen-motion
brew install ffmpeg
npm install            # Next + Puppeteer (+ Chromium) + Remotion
npm run dev            # http://localhost:3000
```

### 3.2 — Builder l'app desktop (Tauri)

Prérequis **supplémentaires** :

- **Rust** (rustup) — toolchain **≥ 1.77**, edition 2021.
- **Xcode Command Line Tools** (macOS) pour la signature.
- Les sidecars (Node + FFmpeg + ffprobe) sont récupérés par
  `scripts/desktop-fetch-binaries.mjs` (lancé pendant le build).

```bash
npm run tauri:build    # produit le .dmg/.app (via desktop-prepare-standalone)
```

### 3.3 — Signer + notariser (macOS, release)

Pipeline : `scripts/notarize-and-staple.mjs` (utilise `xcrun notarytool` +
`stapler`). Secrets requis (cf. `.github/workflows/desktop-release.yml`) :
`APPLE_SIGNING_IDENTITY`, `APPLE_CERTIFICATE(+_PASSWORD)`, `APPLE_ID`,
`APPLE_PASSWORD` (app-specific), `APPLE_TEAM_ID`. Sans eux, le `.dmg` est
non-signé → inutilisable côté utilisateur.

### 3.4 — CLI directe (debug, sans dashboard)

```bash
npx tsx scripts/capture-tour.ts  --tour-id <id> --base-url <url> --out ~/.webgen-motion/tours/<id>
npx tsx scripts/audio-tour.ts    --tour-id <id> --tour-dir ~/.webgen-motion/tours/<id>
npx tsx scripts/compose-tour.ts  --tour-id <id> --tour-dir ~/.webgen-motion/tours/<id>
```

---

## 4. Matrice OS supportés (statut réel)

| OS | Build CI | Distribué | Notes |
|---|---|---|---|
| **macOS arm64** | ✅ | ✅ `.dmg` signé + notarisé | Cible principale, prête |
| **macOS Intel** | ✅ (triple fetché) | 🟠 à valider | Binaires prévus, distribution à confirmer |
| **Windows x64** | ✅ (triple fetché) | 🔴 pas encore taggé | Sidecars OK ; attention SmartScreen sur binaire non signé Windows |
| **Linux x64** | ✅ (triple fetché) | 🔴 pas encore taggé | Sidecars OK ; `.AppImage/.deb` à valider |

---

## 5. Troubleshooting

| Symptôme | Cause probable | Solution |
|---|---|---|
| **La capture échoue / « browser not found »** | Aucun Chromium résolu (app packagée, pas de Chrome système, download échoué) | Vérifier le réseau au 1er lancement ; installer Google Chrome (détecté automatiquement) ; ou poser `WEBGEN_CHROMIUM_BIN` sur un binaire valide |
| **Téléchargement Chromium bloqué/long** | Réseau lent / coupé | Réessayer ; le binaire (~150 Mo) atterrit dans `~/.webgen-motion/browsers` |
| **Compose OK mais sans voix off** | Backend voix non configuré | Wizard `/setup` → ElevenLabs (clé) ou Voicebox local |
| **Voix off échoue** | Clé ElevenLabs absente/invalide ou hors quota | Vérifier la clé dans `/setup` ; ou basculer sur Voicebox |
| **`ffmpeg`/`ffprobe` introuvable (mode dev)** | Pas sur le PATH | `brew install ffmpeg` (macOS) / `apt install ffmpeg` (Linux) |
| **Render 3D noir / WebGL** | Pas de GPU / contexte WebGL | Le compose force `--gl angle` (Metal sur macOS) ; vérifier la RAM |
| **Fenêtre répétée en grille 3×3** | `--gl swangle` (rasterizer logiciel) | ⚠️ NE JAMAIS repasser sur `swangle` : il TUILE les couches animées pendant les transitions. Vérifié 20/07/2026 — `angle` rend proprement. Même cause pour les transitions à filtre CSS (`scale-blur`, `glitch`), réservées au style Glitch explicite. |
| **Windows : alerte SmartScreen** | Binaire non signé Windows | Signature Windows pas encore en place (voir §4) |
| **App refuse de s'ouvrir (macOS)** | Gatekeeper si build non notarisé | Utiliser le `.dmg` officiel (notarisé) ; ne pas contourner Gatekeeper sur un build maison |

---

## 6. Notes licences (binaires tiers)

L'app embarque **FFmpeg sous licence GPL** (dépendance `libx264`) — détails et
obligations de conformité dans `docs/DEPENDANCES-ET-INSTALL.md` §H. À traiter
(textes de licence + offre de source) **avant distribution commerciale**, et à
faire valider par un juriste. Node = MIT, Chrome for Testing = BSD-style.
