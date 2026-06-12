# ANALYSE — Système de montage GEN MOTION

> Analyse complète du pipeline de montage actuel, de ses limites face à un vrai
> monteur vidéo, des options d'intégration d'un moteur de montage, et de la
> stratégie capture mobile.
>
> Date : 2026-06-12 · Branche : `main` (commit `5edeafc`)

---

## 1. Vue d'ensemble du projet

GEN MOTION = pipeline local-first en 3 étages :

| Étage | Script | Rôle | Output |
|---|---|---|---|
| **Capture** | `scripts/capture-tour.ts` | Puppeteer filme le site section par section (frames JPEG 30fps → MP4 h264 via ffmpeg) | `manifest.json` + `section-NN-<cat>.mp4` |
| **Audio** | `scripts/audio-tour.ts` | TTS ElevenLabs/Voicebox par step, cache sha1, timeline alignée sur les durées des sections | `voiceover.mp3` + `voiceover-alignment.json` |
| **Compose** | `scripts/compose-tour.ts` → Remotion | Analyse audio (`analyze-audio.ts`) puis `npx remotion render` : device frames, style presets, transitions, Ken Burns, BeatsLayer, mix audio | `audio-analysis.json` + `final.mp4` |

L'orchestration passe par les routes `src/app/api/motion/tour/*` (NDJSON streams) et l'UI 5 tabs `/tour/[id]`. Tout le storage persiste dans `~/.webgen-motion/`.

---

## 2. Le système de montage actuel — ce qu'il fait vraiment

### 2.1 Timeline Remotion

- Structure : Intro (2.2s) → sections enchaînées → Outro (2.2s) (`remotion/lib/types.ts:115-158`, `remotion/Tour.tsx:46-186`)
- **Durée de chaque section = `frames_capturés / fps`**, figée au moment de la capture (`capture-tour.ts:330`). La compose ne retravaille jamais ces durées (le pacing-trim existe mais est opt-in et casse le sync VO, cf. §3.1).
- Crossfade fixe **0.65s** entre sections (`types.ts:117-122`), fenêtre d'overlap, jamais ajustée.

### 2.2 Habillage (style presets, transitions, Ken Burns, beats)

- **4 presets** (`remotion/lib/style-presets.ts`) : Sober / Energetic / Cinematic / Glitch. Ils ne contrôlent que des amplitudes cosmétiques : `kenBurnsScale/Pan`, oscillation du backdrop, `beatPulseStrength`, `voPauseHaloStrength`, et éventuellement un `transitionOverride`.
- **5 transitions** (`remotion/lib/transitions.ts:12-87`) : fade, scale-blur, swipe, wipe-down, glitch — choisies par un **mapping statique categoryId → transition** (`transitions.ts:94-115`). Même catégorie = toujours la même transition.
- **Ken Burns** : zoom + pan **linéaires** sur la durée de la section, direction alternée par parité d'index (`transitions.ts:135-145`). Aucun lien avec le contenu.
- **BeatsLayer** (`remotion/BeatsLayer.tsx`) : pulse visuel sur les `bgBeats` + halo pendant les `voPauses`. **Purement cosmétique** — il décore le rythme, il ne le pilote pas.
- **Hotspots** (Sprint 15.A, `remotion/lib/hotspots.ts`) : punch-in zoom manuel avec timing fixe (`t`, `dwellSec`), indépendant du Ken Burns et de l'audio.

### 2.3 Verdict

C'est un système de **filmage automatisé + habillage motion design**, pas un système de **montage**. Aucune décision éditoriale n'est prise après la capture : pas de coupe, pas de trim, pas de resynchronisation, pas de variation de rythme. Le rendu "mécanique" que tu ressens vient exactement de là.

---

## 3. Pourquoi ça ne ressemble pas au travail d'un monteur

Un monteur travaille le **rythme** (où couper, combien garder, quand respirer) et la **synchro** (cuts sur la musique, audio qui anticipe l'image). Voici, point par point, ce qui manque — avec les emplacements code :

### 3.1 Durées rigides, temps morts non coupés
- La durée d'une section = ce que Puppeteer a filmé. Si un step `dwellMs: 3000` n'a que 1.5s de VO, on garde 1.5s d'image figée + silence.
- `analyze-audio.ts:292-314` calcule pourtant `audioActiveSec` et `trimRecommended` par section, mais le trim est **opt-in** (`compose-tour.ts:268`) et ne trim que la vidéo, pas l'audio → désync VO si activé (`compose-tour.ts:255-263`). Donc personne ne l'active.
- **Impact : la vidéo finale est ~30-50% plus longue que nécessaire sur les tours bavards.**

### 3.2 Cuts jamais alignés sur la musique
- Les beats sont détectés (`analyze-audio.ts:221-273` → `bgBeats[]` avec `sec` + `strength`) et passés à Remotion (`types.ts:110`)… qui ne s'en sert que pour un pulse décoratif.
- Le crossfade tombe là où la durée capturée le décide — entre deux temps forts, en pleine syncope, au hasard. Un monteur snapperait chaque cut sur le beat le plus proche.

### 3.3 Pas de J-cuts / L-cuts
- Audio et vidéo basculent exactement au même frame (`Tour.tsx:180-185` : `<Audio>` plats, aucun offset). Un montage pro fait entrer la VO de la section suivante ~200-400ms avant le changement d'image (J-cut) ou laisse l'image partir avant l'audio (L-cut). C'est LE truc qui rend un montage "fluide".

### 3.4 Transitions et caméra déterministes
- Transition = f(categoryId), Ken Burns = f(index pair/impair). Zéro contingence au contenu, zéro variété. Prévisible dès la 2e section.
- Le Ken Burns ignore les hotspots : la "caméra" peut dériver à l'opposé du point d'intérêt sur lequel un punch-in est en cours (`SectionPlayer.tsx:106-118` vs `:145-193`).

### 3.5 Les silences VO ne servent à rien
- `voPauses[]` (silencedetect, `analyze-audio.ts:178-211`) pourrait placer les transitions dans les respirations, ralentir l'image, déclencher un freeze élégant. Actuellement : un halo.

### 3.6 Données granulaires perdues ou jetées
- Le `manifest.json` ne garde **aucun timing par step** (quand l'overlay apparaît, quand le click se produit) — juste une durée globale par section (`capture-tour.ts:384-395`). Impossible de re-monter sans re-filmer.
- L'alignement **character-level** d'ElevenLabs (timestamps par caractère ! `audio-tour.ts:540-554`) est archivé dans `voiceover-alignment.json` et **jamais lu** par la compose. C'est de l'or éditorial gaspillé : on sait exactement quand chaque mot est prononcé.

### 3.7 Synthèse des données sous-exploitées

| Donnée | Produite par | Contenu | Usage actuel | Usage possible |
|---|---|---|---|---|
| `bgBeats[]` | analyze-audio | timestamp + force de chaque beat | pulse visuel | **beat-snapping des cuts**, durée de crossfade variable, accents Ken Burns |
| `voPauses[]` | analyze-audio | intervalles de silence VO | halo visuel | placer les transitions dans les respirations, micro-trims |
| `pacing[]` | analyze-audio | durée parlée réelle vs capturée par section | rien (gated) | **trim auto vidéo+audio cohérent** |
| `voiceover-alignment.json` | audio-tour | timestamp de chaque caractère/mot | rien | overlays synchronisés au mot-clé, hotspots auto, sous-titres karaoké |
| manifest per-step timings | *(n'existe pas)* | — | — | re-montage sans re-capture |

---

## 4. Faut-il intégrer un logiciel de montage externe ?

**Réponse courte : non — et c'est une bonne nouvelle.** Remotion **est déjà** un moteur de montage frame-accurate (séquences, offsets, trims, volumes par frame, tout est programmable). Le problème n'est pas le moteur, c'est qu'**aucun cerveau ne lui donne de décisions de montage**. Intégrer MLT ou un NLE ne résoudrait rien : on leur enverrait les mêmes durées figées.

### 4.1 Options examinées

| Option | Verdict | Pourquoi |
|---|---|---|
| **[MLT Framework](https://github.com/sitkevij/awesome-video)** (moteur de Kdenlive/Shotcut) | ❌ | Moteur C orienté desktop NLE, pas de bindings Node officiels, lourd à bundler dans Tauri (on bundle déjà ffmpeg + Node + Chromium). Ferait doublon avec Remotion. |
| **[GStreamer Editing Services](https://gstreamer.freedesktop.org/documentation/gst-editing-services/)** | ❌ | Puissant mais [pas de port Node officiel](https://blog.logrocket.com/using-gstreamer-node-js/), stack GLib entière à embarquer, courbe d'apprentissage énorme. Pertinent seulement si on abandonnait Remotion. |
| **[Editly](https://github.com/mifi/editly)** (Node + ffmpeg déclaratif) | ❌ | Plus simple que Remotion mais moins capable (pas de React, pas de 3D R3F, pas d'audio-réactif). Régression. |
| **ffmpeg filter graphs purs** | ⚠️ partiel | Déjà dans la stack. Utile pour des passes de **pré-traitement** (trim des silences, normalisation), pas pour remplacer la composition. |
| **[auto-editor](https://github.com/sitkevij/awesome-video)** (trim auto des silences) | ⚠️ inspiration | Ne pas l'embarquer (Python), mais répliquer son approche : couper vidéo+audio ensemble sur les silences. On a déjà silencedetect. |
| **Garder Remotion + ajouter une couche de décision (EDL)** | ✅ **recommandé** | Toutes les données nécessaires existent déjà. Voir §5. |
| **Export [OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO)** vers Resolve/Premiere | ✅ **en plus** (Studio) | Interop pro : voir §4.2. |

### 4.2 L'intégration "logiciel de montage" qui a du sens : export OTIO

Plutôt qu'*intégrer* un NLE dans le pipeline, on peut **exporter la timeline vers les NLE pro** :

- **OpenTimelineIO (OTIO)** est le format d'échange de timelines de l'Academy Software Foundation. [DaVinci Resolve importe/exporte le .otio nativement](https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part1411.htm), [Premiere Pro aussi (File → Import / Export → OpenTimelineIO)](https://community.adobe.com/announcements-732/now-released-otio-import-and-export-311699), Final Cut via FCPXML.
- Les cuts simples, le timing et les pistes [transfèrent de façon fiable](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) ; les effets/transitions complexes restent côté Remotion.
- Côté implémentation : le format `.otio` est du JSON → on peut le **générer en pur TypeScript** sans dépendance Python (des libs comme [ChatOctopus/timeline](https://github.com/ChatOctopus/timeline) le font déjà en Node, exports OTIO + FCPXML + Resolve).
- **Pitch produit** : *"Pas satisfait du montage auto ? Ouvre ton tour dans DaVinci Resolve en un clic — sections déjà découpées, VO et musique déjà posées sur la timeline."* C'est une killer feature **Studio Edition** naturelle, et ça répond exactement au besoin "qu'un vrai monteur puisse finir le travail".

---

## 5. Architecture recommandée : l'Edit Engine (EDL)

Insérer une étape **Edit Plan** entre l'analyse audio et le render. Un script `scripts/edit-plan.ts` lit tout ce qu'on produit déjà (`manifest.json`, `voiceover-alignment.json`, `audio-analysis.json`) et écrit un **`edit-plan.json`** — une Edit Decision List que Remotion consomme au lieu de décider lui-même.

```
capture ──► manifest.json ─────────┐
audio   ──► voiceover-alignment ───┼──► edit-plan.ts ──► edit-plan.json ──► Remotion render
analyse ──► audio-analysis.json ───┘         │
                                             └──► (Studio) export .otio / .fcpxml
```

### 5.1 Schéma cible `edit-plan.json`

```ts
{
  version: 1,
  fps: 30,
  clips: [{
    sectionIdx: 1,
    srcFile: "section-01-branding.mp4",
    srcInSec: 0.0,            // trim in (coupe les temps morts détectés)
    srcOutSec: 9.5,           // trim out (audioActiveSec + padding)
    timelineStartSec: 2.2,    // position finale, beat-snappée
    transitionIn: { kind: "swipe", durationSec: 0.5, snappedToBeatSec: 11.6 },
    audioLeadSec: 0.3,        // J-cut : la VO de ce clip entre 300ms avant l'image
    speedRamps: [{ fromSec: 4.0, toSec: 5.2, rate: 0.85 }],  // breathing sur voPause
    kenBurns: { focusX: 0.62, focusY: 0.31, ... }            // dirigé vers le hotspot
  }],
  overlays: [{ text: "...", startSec: 5.21, endSec: 7.8 }],  // synchronisés au mot (alignment)
  markers: { beats: [...], voPauses: [...] }                  // pour debug / éditeur visuel
}
```

### 5.2 Les 6 règles de montage à implémenter (par ordre de ROI)

1. **Trim cohérent vidéo + audio** — couper chaque section à `audioActiveSec + 0.3s` ET re-générer la timeline VO en conséquence (corrige le bug de désync qui rend l'actuel `--enable-pacing-trim` inutilisable). *La plus grosse amélioration perçue : -30% de durée, zéro temps mort.*
2. **Beat-snapping des cuts** — décaler chaque frontière de section (±0.5s max) vers le `bgBeats[].sec` le plus proche, pondéré par `strength`. Durée de crossfade variable : courte (0.3s) sur beat fort, longue (0.8s) sur passage calme.
3. **J-cuts systématiques** — la VO de la section N+1 démarre 200-400ms avant le changement d'image. Trivial dans Remotion : un offset sur la `<Sequence>` audio.
4. **Transitions dans les respirations** — si une `voPause` tombe à ±0.7s d'un cut, aligner le cut sur la pause (priorité : pause VO > beat > position capturée).
5. **Ken Burns dirigé** — si la section a des hotspots, le pan dérive *vers* le premier hotspot au lieu d'alterner par parité. Sinon, varier l'easing (pas que du linéaire).
6. **Overlays word-synced** — utiliser `voiceover-alignment.json` pour faire apparaître l'overlay quand le mot-clé est prononcé. Bonus : sous-titres karaoké (format 9:16 réseaux sociaux — très demandé).

### 5.3 Chantiers connexes

- **Enrichir le manifest** : enregistrer les timings par step pendant la capture (`stepTimings: [{ stepIdx, kind, atSec, dwellSec }]` dans `capture-tour.ts:384-395`). Coût quasi nul, débloque le re-montage sans re-capture et le futur éditeur visuel.
- **Améliorer la détection de beats** : l'actuel peak-picker RMS 50ms (`analyze-audio.ts:221-273`) est correct pour les coups forts ; si besoin de mieux, ajouter une passe spectral-flux (toujours via ffmpeg `astats`/`aspectralstats`, pas de dépendance nouvelle).
- **Mode "edit preview"** dans l'UI compose : visualiser la timeline de l'edit-plan (clips, beats, pauses, cuts) avant le render — embryon de l'éditeur visuel évoqué dans la ROADMAP.

---

## 6. Capture mobile (iOS / Android)

L'architecture actuelle s'y prête bien : il suffit d'un **deuxième backend de capture** qui produit le même `manifest.json` + des MP4 par section — tout l'aval (audio, edit-plan, Remotion, frames 3D iPhone déjà existants !) reste inchangé.

### 6.1 Stack recommandée

| Plateforme | Pilotage | Enregistrement | Notes |
|---|---|---|---|
| **iOS Simulator** | [Maestro](https://dev.to/mskri/recording-ios-simulator-and-android-device-screen-1c1h) (flows YAML) | `xcrun simctl io booted recordVideo --codec h264` | [Frame rate variable → normaliser en CFR 30fps via ffmpeg](https://www.avanderlee.com/workflow/capture-ios-simulator-video-app-preview/) (on a déjà ffmpeg). Pas d'audio (non-problème : notre audio est généré). |
| **Android Emulator** | Maestro | `adb shell screenrecord` (ou `adb emu screenrecord`) | Limite 3 min par segment → découper par section (ce qu'on fait déjà). |
| **Devices physiques** | Maestro / Appium | [scrcpy --record](https://dev.to/mskri/recording-ios-simulator-and-android-device-screen-1c1h) (Android), QuickTime/AVFoundation (iOS) | Phase 2 — l'émulateur/simulateur suffit pour des démos produit. |

### 6.2 Pourquoi Maestro plutôt qu'Appium

- **Flows YAML déclaratifs** (`tapOn`, `scrollUntilVisible`, `inputText`, `assertVisible`) — philosophiquement identiques à nos tours JSON. La traduction `TourStep` → flow Maestro est presque 1:1 (`click`→`tapOn`, `type`→`inputText`, `scroll`→`swipe`, `wait`→`extendedWaitUntil`).
- Un seul binaire CLI, pas de serveur Appium + drivers à maintenir. Setup utilisateur final beaucoup plus simple (cohérent avec le positionnement desktop installable).
- Appium reste l'option de repli si on a besoin de capacités bas niveau (gestures complexes, devices farm).

### 6.3 Plan d'implémentation

1. **`scripts/capture-mobile.ts`** : traduit le tour JSON en flow Maestro, démarre l'enregistrement (`simctl recordVideo` / `adb screenrecord`) par section, exécute le flow, stoppe, normalise en MP4 h264 CFR 30fps yuv420p (mêmes settings que `capture-tour.ts:434-461`).
2. **Schéma tour** : ajouter `platform?: "web" | "ios" | "android"` + `appId`/`bundleId` dans `TourEntry` (`src/lib/types/tour.ts`). Les `TourStep` existants couvrent déjà 90% des besoins ; ajouter `swipe` et `launchApp`.
3. **Splash cards & overlays** : injectées **en post par Remotion** (pas dans l'app comme le fait Puppeteer via DOM) — les timings par step du manifest enrichi (§5.3) rendent ça possible. Avantage : zéro intrusion dans l'app cible.
4. **Format** : 9:16 natif + le frame 3D iPhone existant (`remotion/three/`) = le différenciateur est déjà construit. Le portrait simulé `deviceScaleFactor=2` de la capture web devient inutile pour le mobile réel.

---

## 7. Roadmap proposée

| Sprint | Chantier | Effort | Impact | Statut |
|---|---|---|---|---|
| A | Manifest enrichi (timings par step) + fix trim vidéo+audio cohérent | S | ⭐⭐⭐ durée -30%, plus de temps morts | ✅ **fait** (2026-06-12) |
| B | `edit-plan.ts` v1 : beat-snapping + J-cuts + crossfades adaptatifs + VO segmentée | M | ⭐⭐⭐ le rendu "monteur humain" | ✅ **fait** (2026-06-12) |
| C | Ken Burns dirigé + sous-titres karaoké word-synced (opt-in `subtitles: true`) | M | ⭐⭐ polish + feature sociale | ✅ **fait** (2026-06-12) — overlays Remotion-post restent à faire |
| D | Capture mobile via Maestro (iOS Simulator + Android Emulator) | M-L | ⭐⭐⭐ nouveau marché | ✅ **fait** (2026-06-12) — iOS validé E2E sur simulateur ; Android écrit, non testé (pas d'adb sur la machine) |
| E | Export OTIO/FCPXML vers Resolve/Premiere (Studio Edition) | M | ⭐⭐ interop pro, argument de vente Studio | ⏳ à faire |
| F | Extend-to-fit narrative : freeze/ralenti des sections quand la narration dépasse la vidéo | M | ⭐⭐ débloque les tours narrative mal calibrés | ⏳ identifié à l'implémentation |

> **Note d'implémentation (2026-06-12)** : Sprints A-B-C livrés via
> `scripts/lib/edit-plan.ts` + `remotion/SubtitlesLayer.tsx` (détail dans
> CHANGELOG.md). Deux bugs préexistants découverts et corrigés au passage :
> la détection de beats ne retournait **jamais rien** (ametadata écrit sur
> stdout, le parser lisait stderr) et l'alignment per-step n'était **jamais
> écrit** (`ReferenceError: voiceId` après le mux de voiceover.mp3).

**Le message clé : on n'a pas besoin d'un logiciel de montage externe — on a besoin de prendre des décisions de montage.** Toutes les données pour le faire (beats, silences, alignement mot-à-mot, pacing) sont déjà produites par le pipeline et actuellement jetées. L'Edit Engine les transforme en montage ; l'export OTIO offre la porte de sortie "pro" pour ceux qui veulent finir à la main.

---

### Sources

- [GStreamer Editing Services — docs officielles](https://gstreamer.freedesktop.org/documentation/gst-editing-services/) · [GStreamer en Node.js (LogRocket)](https://blog.logrocket.com/using-gstreamer-node-js/)
- [Editly — montage déclaratif Node+ffmpeg](https://github.com/mifi/editly) · [awesome-video (panorama frameworks)](https://github.com/sitkevij/awesome-video)
- [OpenTimelineIO (ASWF)](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) · [Import OTIO dans DaVinci Resolve](https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part1411.htm) · [OTIO dans Premiere Pro](https://community.adobe.com/announcements-732/now-released-otio-import-and-export-311699) · [ChatOctopus/timeline (export OTIO/FCPXML en Node)](https://github.com/ChatOctopus/timeline) · [resolve-otio plugin](https://github.com/eric-with-a-c/resolve-otio)
- [Recording iOS Simulator & Android (dev.to)](https://dev.to/mskri/recording-ios-simulator-and-android-device-screen-1c1h) · [App Preview via simctl (SwiftLee)](https://www.avanderlee.com/workflow/capture-ios-simulator-video-app-preview/) · [Appium iOS video recording](https://robotqa.com/blog/video-recording-of-ios-appium-testing/)
