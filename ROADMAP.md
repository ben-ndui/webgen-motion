# GEN MOTION — Roadmap

État au **2026-06-12**. Compile les sprints livrés, les chantiers
en cours et les prochaines priorités. Slug repo `webgen-motion`
préservé pour la rétro-compat ; brand UI + domain = `genmotion.app`.

> Pour le détail commit-par-commit + breaking changes : `CHANGELOG.md`.
> Pour le guide d'install agent IA : `CLAUDE.md`.

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

### Sprint 7 — Frames 3D R3F (Beta)

- ✅ Phase 1 — frames 3D R3F procéduraux (iPhone + MacBook silhouettes via primitives R3F + `useOffthreadVideoTexture`)
- ✅ Phase 2 — HDRI studio + post-process (Bloom, BrightnessContrast, Vignette) + détails procéduraux enrichis (Dynamic Island, camera bump, keyboard grid, ports USB-C)
- ✅ Phase 3 — GLB loader optionnel (`public/models/<role>.glb`) + UI gestion models 3D `/setup/models` + preset `cinematic-spin`
- ❌ Phase 4 — Duo multi-device (REVERT) — implémenté commit `e82570f` puis revert `6f0e8fd` après test visuel end-to-end qui a révélé 2 bugs latents Sprint 7 (MacBookDevice screen orientation après hinge rotation + cinematic-spin iPhone edge-on). Diagnostic 15+ renders sans isoler la root cause (hypothèse Remotion+@remotion/three+R3F internals).
- ⚠ **Frames 3D = Beta documentée** : badge UI `3D Beta` + tooltips warning, recommandation default = frames 2D pour usage production. Polish 3D deferred.

### Sprint 8 — Notarization Apple + tag v0.2.0

- ✅ `scripts/notarize-and-staple.mjs` helper end-to-end (build → submit → wait → staple → verify)
- ✅ Bundle prune Stage 5 : 653 MB libérés depuis `runners/node_modules`, 42 Mach-O binaries nested codesigned
- ✅ `.dmg` Apple Notary Accepted + stapled + `spctl --assess` accepted (id `507f1160-fc5e-45b1-82f0-eaab734a8626`)
- ✅ `.app` Apple Notary Accepted + stapled (id `3a0774ec-c758-4e40-b681-f0e2e3f79483`)
- ✅ Tag **v0.2.0** push + GitHub release publique avec `.dmg` notarisé uploaded (manuel, CI matrix Phase A a échoué — fixée Phase B pour prochains tags)
- ✅ CI fixes commit `968ed46` : keychain import macOS + EXDEV Windows + linuxdeploy Ubuntu (effectifs au prochain tag)

### Sprint 9 — License offline-first Ed25519

- ✅ `scripts/generate-license-keypair.mjs` génère Ed25519 keypair (PKCS8 + SPKI + base64 raw)
- ✅ `src/lib/license/{types,serialize,verify,public-key}.ts` — format `.license` PEM-style v1, verify offline avec cache mémoire sha256
- ✅ `src/lib/edition.ts` refactor : `resolveEdition()` → `{edition, source, license?, licenseError?}`. Order priorité env > license file > community fallback.
- ✅ `scripts/issue-license.mjs` CLI backoffice Ben (sign + write `.license` dans `issued/`)
- ✅ Page `/setup/license` server-component + API consolidée `/api/motion/license` (GET/POST/DELETE)
- ✅ E2E verified : valid → studio, expired → error, corrupted → error, no license → community
- ✅ **PROD keypair généré** par Ben + embedded dans `public-key.ts`. Private key OFFLINE.

### Sprint 10 — Stripe checkout MVP

- ✅ Dependency `stripe` v22 + `src/lib/stripe.ts` getStripe lazy
- ✅ Route `/api/stripe/checkout` (POST → Stripe Checkout Session $49 one-time perpétuel)
- ✅ Route `/api/stripe/webhook` (POST → signature verify `constructEvent` → Discord notif sur `checkout.session.completed`)
- ✅ Page `/thanks` server-component + composant `<BuyButton />` réutilisable
- ✅ UI buttons "Acheter Studio · $49" dans `/download` + `/setup/license`
- ✅ **Validated end-to-end** : Ben a fait un test paiement → Discord notif reçue avec commande prête à copier pour `issue-license.mjs`
- ⏳ MVP fulfillment **manuel** — auto-email license = Sprint 11+ (nécessite stocker prod private key dans Vercel env, security tradeoff)

### Sprint 11 — Domain genmotion.app + icons + pages légales

- ✅ Domain swap `webgen-motion.vercel.app` → **`genmotion.app`** dans tout le code
- ✅ App icons next/og (vire favicon Vercel) : `icon.tsx` 32×32 + `apple-icon.tsx` 180×180 + `opengraph-image.tsx` 1200×630
- ✅ Wordmark PNG route `/wordmark-studio.png` edge runtime pour upload Stripe product image
- ✅ Pages légales FR RGPD-compliant via `src/lib/legal/config.ts` single source : `/mentions-legales`, `/confidentialite`, `/cgu`, `/cgv`, `/about`
- ⏳ Action Ben pending : DNS `A 76.76.21.21` chez registrar + Vercel domain add + Stripe webhook URL update

### Sprint 12 — Update popup desktop app

- ✅ Route `/api/version` ISR 5min cache, wrap GitHub Releases API
- ✅ Component `<UpdateChecker />` floating card bottom-right 360px avec dismiss persist localStorage par version
- ✅ `next.config.ts` inject `NEXT_PUBLIC_APP_VERSION` depuis `package.json` au build pour semver compare
- ✅ Skip silencieusement sur hostname Vercel (`genmotion.app`, `*.vercel.app`)

### Sprint 13 — Landing slides carrousel horizontal

- ✅ Refonte `src/app/page.tsx` en mode slides full-viewport (5 slides : Hero · Démo · Comment ça marche · Pricing · CTA)
- ✅ `<SlidesCarousel />` client component : navigation ← → boutons + clavier + swipe + dots + counter
- ✅ Auto-play 5s pause-on-hover/focus/touch, resume 8s post-interaction
- ✅ Tous les slides en DOM (CSS `translateX`) → SEO + accessibility friendly
- ✅ Indications IA pour Agent scraping : `data-wm-id` + `data-tour-section` partout
- ✅ Fix `cb813d0` formula translateX (`% relatif au track 500%, pas au viewport`)

### Sprint 14 — Direct download API (v0.2.1)

- ✅ Route download direct + smart OS detection sur `/download`

### Sprint 15 — Hotspots punch-in + refonte pitch (v0.2.2 / v0.2.3)

- ✅ 15.A : hotspots punch-in zoom + label flottant, Ken Burns dirigé vers les hotspots ; refonte full pitch v0.2.x
- ✅ 15.B : hotspots validés visuellement + fix off-by-one mapping
- ✅ CI desktop-release matrix **débloquée** (macOS arm64+Intel & Windows verts, Linux `.deb` seul) — le quick win « re-tag » est validé

### Edit Engine — le compose devient un vrai montage

- ✅ `scripts/lib/edit-plan.ts` : EDL — trim des temps morts (vidéo + voix sync), cuts snappés sur les beats, J-cuts (VO 250ms avant le visuel), crossfades adaptatifs, segments VO au timing vidéo réel, sous-titres karaoké word-synced (`tour.subtitles`)
- ✅ Flags opt-out : `--no-edit-plan` / `--no-edit-trim`

### Sprint D — capture mobile native iOS / Android

- ✅ `scripts/capture-mobile.ts` : Maestro YAML + `simctl recordVideo` (iOS) / `adb screenrecord` (Android), routé par `tour.platform`
- ✅ Steps mobiles : launchApp / tapOn / inputText / swipe / back + section / overlay / wait

### Sprint E — export OTIO (Studio)

- ✅ `scripts/export-otio.ts` : timeline `.otio` → DaVinci Resolve / Premiere depuis l'edit-plan

### Sprint F — extend-to-fit

- ✅ La vidéo s'allonge pour loger la narration (freeze-frame extension par section quand la VO dépasse)

### Licence FSL-1.1-MIT

- ✅ Passage MIT → **FSL-1.1-MIT** (source-available, usage concurrent interdit, chaque version devient MIT 2 ans après publication ; versions ≤ 0.2.3 restent MIT) + hardening edition

### Landing v0.3 — « vidéos produit as code »

- ✅ Hero compile-loop + sections La Boucle / Pour qui / Comparaison honnête / Manifeste — spec `docs/design/LANDING-V3-WIREFRAME.md`

### Director's Console — le chat IA de l'éditeur (v0.3.0)

- ✅ Chunk 1 : UI + MockTransport — dock latéral persistant (⌘J), prises numérotées, step-cards fantômes → solidification Apply/défaire, timeline ASCII dirty, composer terminal slash + `@Sn` (design : `docs/design/PROMPT-DESIGN-CHAT-IA.md` → 3 phases)
- ✅ Chunk 2 : transport réel Claude BYOK — `POST /api/motion/console/take` NDJSON, tool-use forcé (`respond_take`), validation serveur des diffs (`before` réécrit depuis le tour réel, jamais fourni par le LLM)
- ✅ Chunk 3 : HubConsole — la console sur le dashboard, 3 modes persistés (drawer bas Stripe-style / fenêtre flottante / fenêtre séparée `/console/window` multi-écran sync BroadcastChannel) ; refactor `useConsoleSession` + `ConsoleSurface` partagés
- ✅ Chunk 4 : runs réels — « Lancer » déclenche le vrai pipeline (capture / vo / compose) via `ChatTransport.run()`, resync des tabs post-run, état failed + Relancer, annulation Échap qui tue le process group du runner (0 orphelin)

### Plus

- ✅ Brand-aware compose stage (intro / outro / URL bar tirent de `tour.brand`, fallback computé depuis `name` + `baseUrl`)
- ✅ "Nouveau tour" : modal hub avec slug auto, format, brand pré-rempli, redirect `/tour/<id>`
- ✅ Fix layout : `objectPosition: "top"` pour garder le haut du site visible dans Mac chrome + iPhone frame
- ✅ Fix hooks order dans `/compose/[id]` (useEffect audio hoisté avant les early returns)
- ✅ Fix channel layout : VO mono ElevenLabs ré-encodé stéréo pour matcher les silences anullsrc
- ✅ Rebrand UI → **GEN MOTION** (commit `b8443a6`, slug repo + paths `~/.webgen-motion/` inchangés)
- ✅ Vitrine Vercel auto-deploy sur push main (projet `smooth-and-designs-projects/webgen-motion`)
- ✅ CTA landing env-aware via `process.env.VERCEL` : vitrine = `/download`, local dev = `/dashboard`

---

## 🛠 Prochains chantiers

### Console — suite du chantier

- **Runs depuis le hub** : la console hub ne lance pas de runs (pas de tour ouvert) — brancher `launchRun` sur un tour ciblé par la conversation.
- **Contexte pipeline réel dans les prises** : `handleSend` envoie `hasVoiceover: false / hasFinal: false` hardcodés — brancher `/api/motion/tour/status` pour que le modèle sache où en est le pipeline.
- **Fenêtre détachée en natif Tauri** : `TODO(Tauri)` dans `hub-console.tsx` — WebviewWindow + event system à la place de `window.open` / `window.opener`.

### Auto-fulfillment license (Sprint 11+ candidate)

Aujourd'hui fulfillment **manuel** : webhook Stripe → Discord notif → Ben run `issue-license.mjs` localement → email perso au client. Auto-email Resend / SendGrid possible mais nécessite stocker la prod private key Ed25519 dans Vercel env (acceptable tradeoff au-delà de ~5-10 ventes/jour ; HSM/KMS upgrade quand revenue justifie).

### Frames 3D polish (deferred Sprint 8 diagnostic)

Diagnostic Sprint 8 exhaustif (15+ renders) n'a pas isolé la root cause des rotations parasites iPhone/MacBook. Tous les paths obvious éliminés (preset, transition, composeStyle, section count, MP4 metadata). Hypothèse résiduelle : interaction Remotion + @remotion/three + R3F internals. À reprendre quand budget temps dédié OU repro minimal hors Remotion disponible.

### ElevenLabs alignment plumb-down (raffinement Sprint 4)
- Heuristique de matching avec normalization (digits → words shift les indices entre `alignment` et `normalized_alignment`)
- UI de preview de l'alignment (timeline visuelle char-by-char dans Voice tab)
- Auto-cleanup du `voiceover-alignment.json` orphelin quand le user re-passe en per-step

### Visual category editor
UI pour éditer `categories.json` depuis le hub (mirror du pattern Script tab). Pareil pour `pronunciation.json`. ~1 jour.

### Cursor mode polish
Cursor + click ripple existent dans le runner mais jamais validé visuellement avec un tour qui a des clicks réels. Le meta-demo a maintenant des clicks `data-tab` → candidate pour la validation.

### Mobile / Tablet UI
Le dashboard est admin desktop-first. Une vue tablette simplifiée pourrait servir aux validations vidéo en mode "mobile review".

### Vitrine Vercel polish
Retirer `noindex,nofollow` du layout.tsx quand prêt à pousser SEO. Optionnel : middleware "Desktop app only" pour les routes `/dashboard`, `/tour/[id]`, `/notary`, `/setup` qui crashent en prod Vercel (actuellement 500 silencieux, un fallback UX serait plus propre).

### DMG size optimization
v0.2.0 ship à 454 MB vs cible 300 MB. Probablement Next standalone non-pruné ou assets Remotion conservés. Optionnel post-launch.

---

## 💰 Modèle de distribution

GEN MOTION est un **outil desktop installable** distribué sous licence **FSL-1.1-MIT** (source-available, chaque version devient MIT 2 ans après publication), avec une **Studio Edition** payante ($49 paiement unique perpétuel, Davinci-style) qui débloque les fonctionnalités premium (frames 3D, presets Cinematic & Glitch, multi-format export, music library, watermark removal).

| Audience | Edition | Distribution |
|---|---|---|
| Indie hackers, dev curieux | Community gratuite | Download `.dmg` macOS (Windows + Linux à venir CI) |
| Créateurs pro, agences | Studio $49 perpétuel | Stripe checkout `/download` → `.license` Ed25519 par email |
| Agences digitales | Enterprise sur devis | contact@smoothandesign.fr |

**Vitrine** : [genmotion.app](https://genmotion.app) — landing slides + pages légales FR + Stripe checkout.

### Pourquoi local-first
- Performance optimale (Puppeteer + ffmpeg natifs, pas de cold start CI)
- Pas de vendor lock-in (Vercel / Firebase / Storage)
- Pas de coût d'infra à scaler côté Smooth & Design
- Confidentialité : les captures + vidéos restent sur la machine du dev/créateur
- License verify offline-first : aucun appel serveur, Ed25519 vérifiée localement

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

- **Sprints 1-15 + D/E/F + Edit Engine + Director's Console ✅ done** (extraction → editor → Compose v2 → Voicebox → 3D → notarization → license → Stripe → domain → legal → landing slides → hotspots → montage → mobile → OTIO → extend-to-fit → console IA)
- **v0.2.3 LIVE** (2026-06-06) : CI matrix débloquée + hotspots ; **v0.3.0** = Director's Console (chat IA BYOK, éditeur + hub) + Edit Engine + capture mobile + OTIO + FSL
- **Prochain chantier console** : runs hub + contexte pipeline réel + fenêtre Tauri native
- **Prochain feature majeure** : auto-fulfillment license via Stripe webhook + Resend (Sprint 11+ candidate, débloque scaling au-delà de Ben fulfill manuel)
