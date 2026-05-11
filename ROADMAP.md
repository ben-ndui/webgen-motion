# webgen-motion — Roadmap

État au 2026-05-10. Compile les décisions en cours, les chantiers
identifiés (incluant les discussions side-thread `/btw`), et la vision
SaaS / open-source.

---

## ✅ Fait

### Sprint 1 — extraction depuis uzme-support

- Repo standalone scaffold (Next.js 16 + Turbopack + Tailwind v4)
- Design tokens light slate (mirroring webgen-ai admin)
- Tours data-driven (JSON dans `tours/<id>.json` au lieu d'un catalogue TS)
- Storage persistant `~/.webgen-motion/{tours,audio,vo-cache}/`
- Runners migrés : `capture-tour` / `audio-tour` / `compose-tour`
- API routes migrées + nettoyées (drop NODE_ENV gates, drop AdminGuard)
- Hub `/` + tour preview `/tour/[id]` + compose `/compose/[id]` boot 200
- README quickstart

### Sprint 2 — UX/UI tabs

- ✅ Chunk 1 : page-header + tabs-strip + Script tab (édition VO inline + format selector + stats)
- ✅ Chunk 2 : Capture tab (action card + phase loader streaming NDJSON + sections grid + auto-load via status endpoint)
- ✅ Chunk 3 : Audio tab (MusicLibrary + sliders volumes) + Voice tab (Générer VO + counters + audio preview)
- ✅ Chunk 4 : Compose tab (readiness strip + Composer + final.mp4 player + aperçu live)

### Sprint 3 — distribution + meta-demo

- ✅ CLAUDE.md détaillé pour qu'un agent IA puisse installer webgen-motion
- ✅ README quickstart enrichi (5 tabs, workflow ASCII)
- ✅ Setup wizard (3-step state machine, config dans `~/.webgen-motion/config.json`)
- ✅ Meta-demo : `tours/webgen-motion-itself.json` (per-step VO + clicks `data-tab`)
- ✅ Repo public `github.com/ben-ndui/webgen-motion`

### Sprint 4 — éditeur visuel + features

- ✅ Chunk 1 : `categories.json` + server-only fs loader (palettes éditables sans toucher au TS)
- ✅ Chunk 2 : Visual tour editor inline dans Script tab (expand/up/down/delete par row + saveTour endpoint + SaveBadge)
- ✅ Chunk 3 : Live preview sans re-capture (audio playback synchro via URL params, cycle 30s → 3s)
- ✅ Chunk 4 : Mode narrative ElevenLabs (1 fetch `/with-timestamps`, markers `[step:N]`, calibrate timeline depuis alignment)

### Sprint 5 — Compose v2 (Remotion + motion design pro)

- ✅ Chunk 1 : Setup Remotion + hello-world render (pipeline boot validé)
- ✅ Chunk 2 : Port iso-fonctionnel du compose stage en compositions Remotion (`tour-16x9` / `tour-9x16`)
- ✅ Chunk 3 : Ken Burns sur le device frame, 5 transitions variées par catégorie (fade / scale-blur / swipe / wipe-down / glitch), backdrop motion
- ✅ Chunk 4 : `analyze-audio.ts` — silencedetect sur la VO + onset detection sur bg music → `audio-analysis.json` (pacing trim opt-in)
- ✅ Chunk 5 : `BeatsLayer` réactif (pulse beat + halo VO pause) consommant l'audio analysis
- ✅ Chunk 6 : 4 style presets (Sober / Energetic / Cinematic / Glitch) bundlant Ken Burns intensity + transition override + backdrop amp + beats strength ; dropdown dans Compose tab
- ✅ Chunk 7 : Cutover — `compose-tour.ts` est désormais le runner Remotion (legacy Puppeteer compositor supprimé), `/compose/[id]` reste pour le mode "Aperçu live"

### Sprint 6 — Voicebox (local-first TTS alternative)

- ✅ A1.0 : Backend choice (ElevenLabs cloud / Voicebox local) — schema + runner branche, SSE consumption pour `/generate/{id}/status`
- ✅ A1.0+ : Auto-discover Voicebox profiles via dropdown (proxy `/api/motion/voicebox/profiles`)
- ✅ A1.2 : Setup wizard step "Backend choice" + branche Voicebox avec auto-detect
- ⏳ A1.1 : Forced alignment via `nodejs-whisper` pour réactiver narrative + Voicebox (V0 = error clean)

### Plus

- ✅ Brand-aware compose stage (intro / outro / URL bar tirent de `tour.brand`, fallback computé depuis `name` + `baseUrl`)
- ✅ "Nouveau tour" : modal hub avec slug auto, format, brand pré-rempli, redirect `/tour/<id>`
- ✅ Fix layout : `objectPosition: "top"` pour garder le haut du site visible dans Mac chrome + iPhone frame
- ✅ Fix hooks order dans `/compose/[id]` (useEffect audio hoisté avant les early returns)
- ✅ Fix channel layout : VO mono ElevenLabs ré-encodé stéréo pour matcher les silences anullsrc

---

## 🛠 Prochains chantiers

### Mobile app capture (Maestro + iOS sim, 2-3 jours)
**Décidé en `/btw` (2026-05-10)** : skipped Flutter web (camera/notifs KO en web). Path retenu : Maestro YAML scripts pour les interactions + `xcrun simctl io booted recordVideo` pour la capture. Output natif iPhone, fit dans iPhone frame du compose.

### ElevenLabs alignment plumb-down (raffinement chunk 4)
Le mode narrative pose les bases. Reste à raffiner :
- Heuristique de matching avec normalization (digits → words shift les indices entre `alignment` et `normalized_alignment`)
- UI de preview de l'alignment (timeline visuelle char-by-char dans Voice tab)
- Auto-cleanup du `voiceover-alignment.json` orphelin quand le user re-passe en per-step

### Visual category editor (Sprint 5)
- UI pour éditer `categories.json` depuis le hub (mirror du pattern Script tab).
- Pareil pour `pronunciation.json`.

### Cursor mode polish
- Cursor + click ripple existent dans le runner mais jamais validé visuellement avec un tour qui a des clicks réels.
- Le meta-demo a maintenant des clicks `data-tab` → candidate pour la validation.

### Mobile / Tablet UI
- Le dashboard est admin desktop-first. Une vue tablette simplifiée pourrait servir aux validations vidéo en mode "mobile review".

### CI workflow (option A originelle, en pause)
- `.github/workflows/motion-tour.yml` qui dispatch GH Actions pour capture + compose en cloud.
- Pas la priorité depuis qu'on est passés sur le modèle local-first installable. À ressortir si on veut une démo en ligne.

### Mobile app capture (4.D, ex-pivoté en option 3)
**Décidé en `/btw` (2026-05-10)** : skipped pour l'instant car Flutter web pas configuré sur uzme repo (le `web/` existe mais vide).
- **Path A** : Configurer Flutter web sur uzme (1-2 jours, partial — camera/notifs KO en web). Pas la peine pour l'instant.
- **Path B** (recommandé) : Maestro + iOS Simulator. Stack séparée du runner Puppeteer actuel — Maestro YAML scripts pour les interactions + `xcrun simctl io booted recordVideo` pour la capture. Output natif iPhone, fit dans iPhone frame du compose. ~2-3 jours.
- **Path C** : un wrapper qui embed la captured native MP4 dans le compose pipeline existant.

### Mobile / Tablet UI
- Le dashboard est admin desktop-first. Une vue tablette simplifiée pourrait servir aux validations vidéo en mode "mobile review".

### CI workflow (option A originelle, en pause)
- `.github/workflows/motion-tour.yml` qui dispatch GH Actions pour capture + compose en cloud.
- Pas la priorité depuis qu'on est passés sur le modèle local-first installable. À ressortir si on veut une démo en ligne.

---

## 🌐 Vision SaaS / extraction publique

**Conclusion stratégique (`/btw` puis main thread, 2026-05-10)** : le Motion Studio n'est PAS un SaaS hosted. C'est un **outil portable installable**.

### Pourquoi local-first
- Performance optimale (Puppeteer + ffmpeg natifs, pas de cold start CI)
- Pas de vendor lock-in (Vercel / Firebase / Storage)
- Pas de coût d'infra à scaler
- Confidentialité : les vidéos restent sur la machine du dev

### Distribution v1 (proche)
- `git clone webgen-motion && npm install && npm run dev`
- Audience : devs (collègues Smooth & Design)

### Distribution v2 (futur)
- `npx create-webgen-motion my-tours` → scaffold + boot
- Audience : créateurs / équipes produit qui veulent générer leur propre promo
- Pré-requis : Sprints 3 et 4 ✅ — débloqué, reste à packager

### Intégration smoothandesign / webgen-ai
- Une fois l'outil mature, l'embarquer comme module du WebGen ecosystem
- "Generate your project's promo video in 1 click" depuis le dashboard WebGen

---

## 📋 Décisions enregistrées (raisonnement préservé)

### Pourquoi onglets state-based, pas route-based
Cible mirror de `/admin/social/[accountId]/create-tab` dans webgen-ai : `useState<TabKey>` switch les vues. Plus simple, l'éditeur visuel à venir bénéficie d'un seul fichier orchestrateur.

### Pourquoi tours en JSON, pas en TS
Data-driven → l'utilisateur n'a pas besoin de connaître TypeScript pour ajouter un tour. Aussi nécessaire pour le visual editor du Sprint 4.

### Pourquoi `~/.webgen-motion/` et pas `tmpdir()`
`/tmp` est wipé au reboot → l'historique disparaît. `~/.webgen-motion/` survit + permet à l'historique d'être un vrai feature.

### Pourquoi pas Vercel Blob / Firebase Storage
On a évalué les deux dans le main thread. Conclusion : un outil local-first n'a pas besoin de cloud storage. Filesystem rapide + portable.

### Pourquoi UZME comme demo et non comme prod-tied
UZME est l'exemple canonique car il a un site responsive et une app prête. Mais le pipeline est totalement projet-agnostic — `tour.baseUrl` + `tour.brand` peuvent pointer ailleurs.

### Pourquoi un champ `brand` séparé sur TourEntry
Le compose stage avait des "UZME" / "uzme.app" hardcodés. Plutôt que de tout dériver à la volée (fragile sur les noms longs comme "UZME · Landing 16:9"), `brand` est explicite avec fallbacks computés. Le user peut affiner sans toucher au code.

### Pourquoi narrative mode est ElevenLabs-only
`/with-timestamps` est l'endpoint qui donne char-level alignment. Sans ça, impossible de calibrer les `dwellMs` au mot près. Coqui / Bark / autres open TTS ne fournissent pas cette granularité aujourd'hui.

---

## ⏰ Cadence

- Sprints 1-4 ✅ done
- Mobile app capture (Maestro) : ~2-3 jours quand Ben veut
- `npx create-webgen-motion` packaging : ~1 jour
- Visual category editor : ~1 jour

Reste avant SaaS-ready public : **~3-4 jours de boulot focused** (mobile capture + packaging npx).
