# GEN MOTION v0.2.3

**Première release desktop auto-buildée** 🖥️ — la matrice CI 4-OS est enfin verte, donc v0.2.3 embarque **tout depuis v0.2.0** (les tags v0.2.1 et v0.2.2 n'avaient jamais produit de build à cause de la CI).

> GEN MOTION — Motion Studio **local-first** : capture ton site, clone ta voix, compose un clip vidéo prêt à publier. 100% sur ta machine, sans cloud. Par **Smooth & Design** · Nice.

---

## ⬇️ Installer

| Plateforme | Fichier | Statut |
|---|---|---|
| **macOS Apple Silicon** | `.dmg` | ✅ notarisé Apple |
| **macOS Intel** | `.dmg` | ✅ notarisé Apple (cross-build) |
| **Windows** | `.exe` / `.msi` | ✅ |
| **Linux** | `.deb` | ✅ (AppImage : bientôt) |

**macOS** : ouvre le `.dmg`, glisse GEN MOTION dans Applications. Le binaire est notarisé + stapled → pas d'avertissement Gatekeeper.

Prérequis : macOS 13+ · 8 Go RAM (16 recommandé). FFmpeg & Chromium sont embarqués.

---

## ✨ Nouveautés clés

- **Hotspots punch-in** (inspiré Supademo / Keynote) — pendant une section, zoom cinématique sur une zone + pill label flottante pour guider l'œil. Transforme un screencast plat en démo storytellée. Configurable par section dans le tour JSON.
- **App desktop notarisée** — pipeline complet (capture · voix off · compose) packagé en app native Tauri, signée + notarisée Apple.

## 📦 Embarqué depuis v0.2.0 (via v0.2.1 / v0.2.2)

- **Studio Edition $49** — license offline-first **Ed25519** (vérifiée localement) + **checkout Stripe** one-time.
- **Frames 3D Beta** — iPhone & MacBook (R3F) dans le compositeur.
- **Smart download** — détection OS + téléchargement direct du bon asset.
- **Update popup** — l'app vérifie la dernière version au lancement.
- **Vitrine genmotion.app** — landing, page download, **pages légales FR** (mentions / confidentialité / CGU / CGV) + à propos.
- **Rebrand** complet `webgen-motion` → **GEN MOTION**.

## 🔧 Corrections

- **CI desktop-release débloquée** : macOS Intel cross-compilé sur runner Apple Silicon (les runners Intel ne démarraient plus), Linux basculé en `.deb`, Actions sur Node 24 (`checkout@v5` / `setup-node@v5`).
- **Hotspots** : bug de mapping off-by-one (label appliqué à la section précédente), sections pointant un tour mort repointées, timings recalés post-splash, coords calées sur l'UI réelle.

## ⚠️ Connus (non bloquants)

- **Linux AppImage** : reporté (linuxdeploy KO en CI) — le `.deb` couvre l'install.
- `scripts/analyze-audio.ts` : le pacing-trim audio est désactivé (sans impact sur le rendu).

---

🔗 Code : https://github.com/ben-ndui/webgen-motion · Documentation : https://genmotion.app/help

🤖 Notes générées avec [Claude Code](https://claude.com/claude-code)
