# Ton premier tour avec webgen-motion

Un **tour** = un scénario JSON qui dit à webgen-motion comment filmer un projet (sections, overlays, clicks, voix off). L'outil est totalement agnostique : il n'a aucune notion de "projet lié", il lit juste l'URL `baseUrl` de ton tour et y lance Puppeteer.

Ce guide te fait passer du clone à la première vidéo générée en ~5 minutes.

---

## 1. Setup (1 fois par install)

```bash
npx create-webgen-motion@latest mon-projet-promo
cd mon-projet-promo
brew install ffmpeg        # macOS
npm run dev                # http://localhost:3000
```

Ouvre <http://localhost:3000>, clique **Setup** en haut à droite, colle tes clés ElevenLabs :

- **API key** — [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
- **Voice ID** — copie depuis le studio de voix clonée (ou utilise une voix stock)

Stocké dans `~/.webgen-motion/config.json`. Survit aux reboots, partagé entre tous tes tours.

---

## 2. Créer un tour

Hub → **Nouveau tour** → renseigne :

- **Nom** : visible partout dans l'UI (ex : `Acme · Landing`)
- **Id** : auto-slugifié depuis le nom (ex : `acme-landing`), modifiable
- **Format** : `16:9` desktop / `9:16` mobile (TikTok / Reels / Stories)

→ crée `tours/<id>.json` et te redirige vers l'éditeur. Tu peux aussi écrire le JSON à la main, le hub liste auto tous les fichiers `tours/*.json`.

---

## 3. Le lien projet ↔ tour : `baseUrl`

Dans le tour JSON, le seul vrai "lien" avec ton projet c'est `baseUrl` :

```json
{
  "id": "acme-landing",
  "name": "Acme · Landing",
  "baseUrl": "https://acme.com",
  "startPath": "/",
  "brand": {
    "displayName": "Acme",
    "domain": "acme.com",
    "tagline": "by Smooth & Design"
  },
  "voiceId": "<voix-clonée-acme>",
  "format": "16:9",
  "steps": [ /* … */ ]
}
```

- **`baseUrl`** : la racine de ton site/app. Puppeteer y lance Chromium.
- **`startPath`** : chemin de départ (relatif à baseUrl).
- **`brand`** : ce qui s'affiche dans le compose stage (intro card, outro card, Mac chrome URL bar). Sinon dérivé de `name` + `baseUrl`.
- **`voiceId`** / **`voiceModel`** : override la config globale pour CE tour. Utile si chaque projet a sa voix clonée.

---

## 4. Définir les étapes du tour

Chaque step a un `type` et des props. Le runner les exécute en séquence. Types principaux :

| Type | Effet | Champs clés |
|---|---|---|
| `section` | Splash card colorée + ouvre une nouvelle MP4 | `categoryId`, `title`, `subtitle`, `dwellMs`, `goto` |
| `overlay` | Texte motion design par-dessus la page | `text`, `position` (top/center/bottom), `dwellMs` |
| `scroll` | Scroll la page (ou un container) | `to` (px), `selector` (optionnel) |
| `click` | Clique un élément | `selector` (CSS) |
| `type` | Tape dans un input | `selector`, `text` |
| `hover` | Hover un élément (utile pour tooltips) | `selector` |
| `goto` | Navigate vers une URL | `url` |
| `wait` | Pure pause | `dwellMs` |

Tous les types de step "voix off-friendly" (section, overlay, scroll, wait, hover) peuvent porter un champ `voiceover` (texte parlé par ElevenLabs pendant le step).

### Trouver les sélecteurs CSS

1. Ouvre ton site cible dans Chrome
2. `⌘⌥I` (Mac) ou `F12` → DevTools
3. Clique l'icône inspect (carré + flèche) en haut-gauche
4. Survole l'élément à cliquer dans la page → clique dessus
5. Dans l'arbre DOM, clic droit sur la balise → **Copy → Copy selector**

> **Tip** : préfère les sélecteurs stables (`[data-testid="…"]`, `[data-tab="…"]`, `#hero h1`) plutôt que ceux auto-générés (`.css-1a2b3c4`). Si t'as la main sur le code du site, ajoute des `data-*` attributs aux éléments clés de la promo.

---

## 5. Le workflow en 5 onglets

Dans `/tour/<id>` :

```
┌─ Script ────────────────────────────────────────────┐
│   Édite steps + voix off + format + brand + voiceId │
└─────────────────────────────────────────────────────┘
                          ↓
┌─ Capture ───────────────────────────────────────────┐
│   Puppeteer filme ton site section par section      │
│   → ~/.webgen-motion/tours/<id>/section-NN-*.mp4    │
└─────────────────────────────────────────────────────┘
                          ↓
┌─ Audio ─────────────────────────────────────────────┐
│   Upload musique de fond + sliders volumes mix      │
└─────────────────────────────────────────────────────┘
                          ↓
┌─ Voix off ──────────────────────────────────────────┐
│   ElevenLabs synthèse + alignment char-level        │
│   Mode per-step OU narrative continu                │
│   → ~/.webgen-motion/tours/<id>/voiceover.mp3       │
└─────────────────────────────────────────────────────┘
                          ↓
┌─ Compose ───────────────────────────────────────────┐
│   Re-films la stage React (Mac chrome / iPhone)     │
│   avec mix audio + transitions                      │
│   → ~/.webgen-motion/tours/<id>/final.mp4           │
└─────────────────────────────────────────────────────┘
```

État persisté entre tabs (localStorage) et entre sessions (filesystem). Si tu rouvres un tour qui a déjà été capturé, le tab Capture restore automatiquement.

---

## 6. Mode narrative continu (avancé)

Pour une vidéo où la voix off est UN texte continu et fluide (pas une ligne par step) :

1. Tab **Voix off** → toggle **Narrative**
2. Écris le script entier avec des markers `[step:N]` au moment où chaque overlay doit apparaître :

```
[step:0]Bienvenue chez Acme. [step:2]Notre promesse : simplifier ta vie. [step:5]Disponible sur iOS et Android.
```

3. **Générer la voix off** → 1 fetch ElevenLabs `/with-timestamps` → MP3 + alignment char-level
4. **Calibrer la timeline** → recalcule les `dwellMs` de chaque step pour matcher le pacing réel de la voix
5. Re-Capturer → les sections MP4 ont les bonnes durées
6. Composer → mix parfaitement synchronisé

---

## 7. Multi-projets — deux patterns

**Pattern A — Une install, N tours** (recommandé pour ≤10 projets)

```
mon-promo/
└── tours/
    ├── acme-landing.json       baseUrl: acme.com    voiceId: <voix-acme>
    ├── beta-startup.json        baseUrl: beta.io     voiceId: <voix-beta>
    └── gamma-saas.json          baseUrl: gamma.app   voiceId: <voix-gamma>
```

Un seul `~/.webgen-motion/config.json` global (API key partagée), chaque tour a son override `voiceId` + `brand` + `baseUrl`.

**Pattern B — Une install par projet** (recommandé pour isolation)

```
~/projects/
├── acme-promo/      ← npx create-webgen-motion acme-promo
├── beta-promo/      ← npx create-webgen-motion beta-promo
└── gamma-promo/     ← npx create-webgen-motion gamma-promo
```

Chaque dossier est un projet Node.js indépendant. Plus lourd à maintenir mais isolation totale (config, tours, captures, voiceovers).

---

## 8. Où vont mes fichiers ?

Tout est local, organisé sous `~/.webgen-motion/` :

```
~/.webgen-motion/
├── config.json                 # Setup wizard (creds ElevenLabs)
├── audio/                      # Library musique de fond
│   ├── index.json
│   └── <slug>-<epoch>.mp3
├── vo-cache/                   # TTS cache (par voix + texte)
│   ├── <sha1>.mp3
│   └── <sha1>.alignment.json
└── tours/
    └── <tourId>/
        ├── manifest.json
        ├── section-NN-<cat>.mp4
        ├── voiceover.mp3
        ├── voiceover-alignment.json
        └── final.mp4
```

Survit aux reboots, jamais commit dans git, partagé entre tous tes tours.

---

## FAQ

**Q : Je peux filmer un site en localhost ?**
A : Oui. `baseUrl: "http://localhost:3000"` marche tant que ton site tourne pendant la capture.

**Q : Ça marche sur une app qui demande un login ?**
A : Pas encore en standard. Tu peux mettre `auth: "admin"` sur le tour et plumber manuellement un cookie de session (à voir avec une PR future).

**Q : La voix off est en décalage avec les overlays ?**
A : Bascule sur le mode **narrative continu** et utilise **Calibrer la timeline**, ça aligne au mot près.

**Q : Comment je supprime un tour ?**
A : Supprime le fichier `tours/<id>.json`. Pour aussi nettoyer les captures, `rm -rf ~/.webgen-motion/tours/<id>/`.

**Q : Mon site change beaucoup, les sélecteurs CSS cassent. Comment je fixe ça ?**
A : Demande à ton équipe d'ajouter des `data-testid="…"` ou `data-tab="…"` sur les éléments clés du tour. Stables face aux refactors CSS.

---

Made with ❤ in Nice by [Smooth & Design](https://www.smoothandesign.fr).
