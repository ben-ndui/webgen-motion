# Prompt — Audit & V1 push pour webgen-motion

> À copier-coller dans Claude Code (ou Cursor / Copilot Agent) à la racine
> du repo `webgen-motion`. Ce prompt est **autosuffisant** — un agent qui
> n'a jamais vu ce repo doit pouvoir l'exécuter end-to-end.

---

## 🎯 Rôle

Tu es un agent senior qui prend en main **webgen-motion** : un outil
local-first de génération de vidéos motion design pour sites/apps web
(Puppeteer + ElevenLabs + Remotion + Tauri shell). Le projet est en
0.2.0, 78 commits, sprints 1-6 livrés. Avant de coder, **lis dans cet
ordre** :

1. `CLAUDE.md` — guide agent IA, contient pitfalls + décisions
2. `ROADMAP.md` — sprints livrés + chantiers ouverts
3. `README.md` — workflow user 5 tabs
4. `src/lib/types/tour.ts` — schéma TourEntry / TourStep
5. `remotion/Tour.tsx` + `remotion/lib/style-presets.ts` — composition

Tu vas trouver une stack solide. **Ne refactor pas pour le plaisir.**
Respecte les décisions enregistrées (local-first, JSON-driven, tabs
state-based, `~/.webgen-motion/`).

---

## ✅ Ce qui marche déjà — ne pas casser

- **Pipeline 3-runners** : `capture-tour.ts` → `audio-tour.ts` →
  `compose-tour.ts`, chacun spawnable indépendamment, NDJSON streaming
  vers les routes Next.
- **Remotion cutover (Sprint 5 chunk 7)** : le legacy Puppeteer
  compositor a été supprimé. La compose passe par
  `npx remotion render tour-{16x9|9x16}`. Ne ré-introduis pas l'ancien.
- **`runner-spawn.ts`** : abstraction dev vs Tauri packaged. Tout
  spawn de runner passe par là. Si tu ajoutes un nouveau runner, ajoute
  son entry dans `RUNNER_FILES`.
- **`next.config.ts`** avec `outputFileTracingExcludes` +
  `serverExternalPackages` : c'est ce qui ramène le bundle Tauri de
  2.4 GB à 1.2 GB. **Ne touche pas à ces excludes sans benchmark
  avant/après.**
- **Storage `~/.webgen-motion/`** : passe **TOUJOURS** par
  `src/lib/motion-tour-store.ts` (`getMotionToursBaseDir()` /
  `getMotionTourDir(id)`). Aucun chemin hardcodé.
- **4 style presets** (`sober / energetic / cinematic / glitch`) dans
  `remotion/lib/style-presets.ts`. C'est le vrai diff produit — si tu
  ajoutes des knobs, ajoute-les au type `ComposeStyle` et dimensionne
  les 4 presets.

---

## 🔥 Chantiers prioritaires

### CHANTIER 1 — Validation Zod des tours (BLOQUANT pour `npx create-webgen-motion`)

**Pourquoi** : les tours sont édités via le visual editor **et** en JSON
direct par des users qui ne connaissent pas TypeScript. Aujourd'hui, un
`categoryId` invalide ou un `dwellMs` négatif crashent le runner avec
un message obscur.

**À faire** :

1. Ajouter `zod` aux deps (`npm i zod`).
2. Créer `src/lib/types/tour-schema.ts` qui mirror `TourEntry` /
   `TourStep` en Zod schemas (`z.discriminatedUnion("type", [...])` pour
   les steps). Garde `tour.ts` comme source des types — utilise
   `z.infer<>` pour rester DRY.
3. `src/lib/tour-loader.ts` : `getTour(id)` parse via le schéma et
   throw un `TourValidationError` typé en cas d'échec (au lieu du
   crash silencieux).
4. Nouvelle route `POST /api/motion/tour/validate` :
   - Body : `{ tour: unknown }`
   - 200 : `{ valid: true }`
   - 400 : `{ valid: false, errors: ZodIssue[] }`
5. Brancher dans le visual editor (`script-tab.tsx`) : avant
   `saveTour`, hit `/validate`, surface les erreurs inline.

**Critères d'acceptation** :
- Un tour avec `dwellMs: -100` est refusé avec un message lisible.
- Un tour avec `categoryId: "inexistant"` est accepté (les categories
  sont éditables via `categories.json`, on ne valide pas leur existence
  ici) **mais** le runner log un warning explicite.
- Le tour `tours/webgen-motion-pitch.json` actuel passe la validation
  sans modif.

---

### CHANTIER 2 — Forced alignment Whisper (débloque narrative + Voicebox)

**Pourquoi** : le mode narrative est ElevenLabs-only car seul EL fournit
le char-level alignment via `/with-timestamps`. Avec Voicebox (local),
le mode narrative crash en V0. Le marker `[step:N]` ne peut pas se
résoudre.

**Statut actuel** : ROADMAP.md A1.1 = ⏳ "Forced alignment via
nodejs-whisper". Skipped pour la V1.

**À faire** (proposition validée — **demande validation à Ben avant de
coder** car ça change le sidecar bundle) :

1. **Switcher de `nodejs-whisper` à `whisper.cpp` direct** comme
   sidecar Tauri. Raisons :
   - 3-5× plus rapide CPU (vs Node wrapper)
   - Binaires statiques pour macOS-aarch64, macOS-x86_64, linux,
     win32 dispos sur les releases upstream
   - Pattern identique à `ffmpeg` / `ffprobe` qui marche déjà
     (cf. `src-tauri/src/lib.rs::sidecar_binary_path`)
2. Étendre `scripts/desktop-fetch-binaries.mjs` pour télécharger
   whisper.cpp builds + un modèle léger (`ggml-small.bin` ou `tiny`
   selon perf).
3. `WEBGEN_WHISPER_BIN` + `WEBGEN_WHISPER_MODEL` env vars exposées par
   le Tauri shell aux runners.
4. Dans `scripts/audio-tour.ts`, ajouter `transcribeWithAlignment(mp3Path)`
   qui spawn whisper.cpp en mode `--output-json --max-len 1 --split-on-word`
   et retourne le même shape que l'alignment EL (char-level).
5. Le mode narrative Voicebox : génère le MP3 complet → transcrit
   localement → matche les markers `[step:N]` sur les words.

**Critères d'acceptation** :
- Un tour avec `voiceMode: "narrative"` + `voiceBackend: "voicebox"`
  produit un `voiceover.mp3` + `voiceover-alignment.json` exploitable
  par le calibrate.
- Le dev mode (sans Tauri) doit aussi marcher : fallback sur
  `whisper.cpp` au PATH (instruction d'install dans README + setup
  wizard).
- Pas de régression sur le path ElevenLabs.

---

### CHANTIER 3 — Refacto `TourClient.tsx` (god component à 751 lignes)

**Pourquoi** : c'est devenu un orchestrateur unique pour 5 state
machines + 3 NDJSON streamers + persistence localStorage + 5 tickers.
L'éditeur visuel à venir et les nouveaux modes vont étouffer ce fichier.

**À faire** :

1. Extraire 1 hook par tab d'I/O :
   - `useCaptureRun(tourId)` → `{ state, start, reset }`
   - `useVoiceRun(tourId)` → `{ state, start, reset }`
   - `useComposeRun(tourId)` → `{ state, start, reset }`
   Chacun encapsule son ticker + son NDJSON consumer.
2. Extraire `useStreamingPhase<T>(url, body)` réutilisable qui lit
   un NDJSON stream et émet un `PhaseEvent` typé. Les 3 hooks ci-dessus
   le consomment.
3. `useTourPersistence(tourId)` : centralise les 3 localStorage
   (formatKey, bgMusicKey, volumesKey) → un hook qui rend
   `{ format, setFormat, bgMusicId, setBgMusicId, volumes, setVolumes }`.
4. `TourClient` passe de 751 à ~300 lignes, devient une vraie
   coordination tabs + save bar.

**Critères d'acceptation** :
- Aucun changement visible côté UI (même comportement, mêmes events,
  même persistence).
- `wc -l src/app/tour/[id]/TourClient.tsx` < 350.
- `wc -l src/hooks/*.ts` apparaît avec les nouveaux hooks.

---

### CHANTIER 4 — Tour templates système + `npx create-webgen-motion` polish

**Pourquoi** : aujourd'hui le scaffold copie le repo, drop les tours
demo, et laisse l'user devant un dossier `tours/` vide. Friction max
pour un user qui veut juste sortir une vidéo.

**À faire** :

1. Créer `tours/_templates/` (le préfixe `_` exclut du listing hub —
   à wirer dans `tour-loader.ts::getAllTours()`) avec :
   - `template-saas-landing.json` — 5 sections (hero / problem / features
     / pricing / cta), 16:9, energetic
   - `template-mobile-feature.json` — 4 sections portrait, cinematic
   - `template-artist-epk.json` — 3 sections, glitch (pour les artistes
     comme Ben, c'est ton vrai vibe)
2. `packages/create-webgen-motion/index.js` :
   - Ajoute un prompt interactif (utilise `readline/promises` builtin,
     reste dependency-free) :
     ```
     ? Template de départ ?
       ◯ saas-landing  (5 sections, 16:9, energetic)
       ◯ mobile-feature (4 sections, 9:16, cinematic)
       ◯ artist-epk     (3 sections, 9:16, glitch)
       ◯ blank          (juste un demo-target neutre)
     ```
   - Copie le template choisi en `tours/my-first-tour.json` avec un
     `name` / `id` dérivés du nom de projet
3. Mettre à jour le `--help` + le README de `packages/create-webgen-motion`.

**Critères d'acceptation** :
- `npx create-webgen-motion test-proj` avec choix `saas-landing` →
  `tours/my-first-tour.json` existe et valide via CHANTIER 1.
- Le hub `/dashboard` affiche immédiatement la carte du tour, prête
  à capturer (si `baseUrl` pointe sur localhost:3000 par défaut).

---

### CHANTIER 5 — Draft mode pour la boucle créative

**Pourquoi** : un render Remotion full-qualité prend ~150s wall time.
Si l'user itère sur le script (change un overlay, recalibre les
dwells), il fait 5-10 renders. C'est friction.

**À faire** :

1. `scripts/compose-tour.ts` accepte `--draft` :
   - Force `--scale 0.5` Remotion → 960×540 (16:9) / 540×960 (9:16)
   - Skip `analyze-audio.ts` (utilise des beats statiques + halo VO
     vide → pas d'analyse onset)
   - Output dans `final-draft.mp4` (à côté de `final.mp4`)
2. Compose tab : nouveau bouton "**Brouillon** (~30s)" à côté du
   bouton "Composer" principal.
3. Player UI : si `final.mp4` ET `final-draft.mp4` existent, montre
   un toggle.

**Critères d'acceptation** :
- Draft render ≤ 1/3 du temps full sur le tour pitch (mesure-le et
  écris-le dans la PR).
- `final.mp4` n'est jamais écrasé par un draft.

---

## 📋 Ordre suggéré + ETA

| # | Chantier | ETA | Bloque quoi |
|---|---|---|---|
| 1 | Zod validation | 0.5 j | Visual editor sain + `npx create-webgen-motion` users |
| 4 | Templates + npx polish | 0.5 j | Première vidéo en < 5 min pour un nouveau user |
| 5 | Draft mode | 0.5 j | UX de boucle créative |
| 3 | TourClient refacto | 1 j | Maintenabilité long terme (pas user-facing) |
| 2 | Whisper alignment | 1.5 j | Mode narrative complet (Voicebox) — gros impact tech |

**Total : ~4 jours focused**, exactement ce que dit ROADMAP.md pour la
V1 publique. Demande validation à Ben avant CHANTIER 2 (gros sidecar
bundle + télécharge un modèle Whisper, choix stratégique).

---

## 🧰 Conventions du repo à respecter

- **Commits** : conventional commits, le pattern actuel est
  `feat(<scope>): <description>` ou `fix(<scope>): ...`. Exemples
  réels du repo :
  - `feat(compose-v2 ch6): style presets (sober / energetic / ...)`
  - `feat(desktop stage 4): bundled Node + ffmpeg + ffprobe sidecars`
- **Branches** : pas de branche obligatoire (Ben pousse sur main),
  mais si tu fais une PR, nomme-la après le chantier
  (`chantier-1-zod-validation`).
- **TypeScript strict** : `tsconfig.json` a `strict: true`. Pas de
  `any` non justifié.
- **Pas de bullet lists dans les docs** sauf quand essentiel (cf.
  conventions Smooth & Design — la prose en paragraphes prime).
- **Commentaires** : les fichiers existants sont **densément
  commentés** (cf. `runner-spawn.ts`, `motion-tour-store.ts`,
  `style-presets.ts`). Respecte ce style — explique le **pourquoi**,
  pas le **quoi**.
- **Lucide-react pour les icônes**, pas react-icons (en cours de
  migration).
- **Tailwind v4 + design tokens slate** — pas de couleur hardcodée.
- **`use client` minimal** : tour-loader.ts utilise `node:fs`, ne
  l'importe **jamais** depuis un client component (cf. pitfall doc).

---

## ⚠️ Pitfalls connus (cf. CLAUDE.md)

1. **Next 16 — `params` est une `Promise`** : `await params` côté
   server, `use(params)` côté client.
2. **`__name` shim Puppeteer** : `scripts/capture-tour.ts` injecte
   `window.__name = fn => fn`. Si tu vois `__name is not defined`
   dans les logs page, étends le shim.
3. **Tauri packaged** : ne shell jamais `npx` direct, passe par
   `resolveRunnerSpawn()` qui choisit `process.execPath + tsx CLI`
   en packaged et `npx` en dev.
4. **VO channel layout** : ElevenLabs sort mono, mais les silences
   anullsrc sont stéréo → ré-encode stéréo dans `audio-tour.ts` sinon
   le mix ffmpeg merde.

---

## 🚀 Quand tu finis chaque chantier

1. `npm run lint` doit passer.
2. `npm run build` doit passer (le tracing root de
   `outputFileTracingRoot` est sensible).
3. Test manuel : `npm run dev` → `/dashboard` → ouvrir un tour →
   capturer → générer VO → composer. La pipeline complète doit
   tourner en local.
4. Sur le draft mode (chantier 5) : mesure le temps réel et écris-le
   dans le commit message.
5. Update `ROADMAP.md` : passe le chantier de ⏳ à ✅ avec la date.

Bonne chasse.

---

## 📍 Contexte sur Ben (pour aligner le ton)

Ben Ndui — dev mobile senior Flutter/Firebase, artiste rap, créatif
visuel, fondateur de Smooth & Design. Ses autres projets :
- **ïON** : plateforme communautaire pour artistes (Flutter + Firebase)
- **Consentia** : app consentement
- Plugin Flutter custom (ReplayKit + facecam) → expertise sidecar/native
  qui peut directement servir l'extension mobile de webgen-motion

Préfère un ton dev → dev, force de proposition, idées concrètes
exploitables. Pas de hype, pas de remplissage. Si tu hésites entre 2
approches, pose la question — il préfère décider lui-même sur les
choix stratégiques.
