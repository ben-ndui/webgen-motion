# Changelog

Toutes les évolutions notables de **webgen-motion** sont consignées ici.

Format : [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ·
Versioning : [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

La cible `v0.2.0` est la première version distribuable publiquement (`.dmg`
macOS signé + notarized). Tout ce qui est sous _Unreleased_ atterrira
dans cette tag dès qu'Apple aura validé la notarization.

## [Unreleased]

(rien pour l'instant — v0.2.2 vient de sortir, prochaine ouverture quand on attaque le fix Tauri sidecar terminal (Sprint 16) ou auto-fulfillment license)

---

## [0.2.2] — 2026-05-18

Polish post-v0.2.1 — fixes des 3 issues remontées après le ship :

### Fixed (CI Ubuntu — Linux build)

- **Linux ffmpeg URL** : `johnvansickle.com` a fait timeout 135s sur le runner GitHub Ubuntu lors du tag v0.2.1 → switch vers `BtbN/FFmpeg-Builds` GitHub releases (même mirror éprouvé que pour Windows). Modifié `scripts/desktop-fetch-binaries.mjs` :
  - ffmpeg : `https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz`, extractPath `ffmpeg-master-latest-linux64-gpl/bin/ffmpeg`
  - ffprobe : même tarball, extractPath `bin/ffprobe`
- Effectif au prochain tag — v0.2.2 va re-tester la matrix CI complète.

### Changed (Tauri app icons → GM wordmark)

- **`src-tauri/icons/source.svg`** réécrit : "GM" bold blanc sur fond noir squircle (rounded 220px), cohérent avec `apple-icon.tsx` web favicon. L'ancien était un placeholder geometric (carré avec dots + play triangle) du 12 mai pre-rebrand GEN MOTION.
- **Tous les formats Tauri régénérés** via `npm run tauri:icon` : `icon.icns` macOS, `icon.ico` Windows, PNGs 32/64/128/128@2x, Square tiles UWP Windows, Android mipmaps complets. L'app installée affichera maintenant le bon icon dans Finder + Dock + launcher.

### Improved (Landing slides — scroll trackpad / molette)

- **`<SlidesCarousel />`** : ajout `onWheel` handler qui navigue entre slides quand l'utilisateur scroll avec le trackpad Mac (swipe horizontal `deltaX`) ou la molette souris (`deltaY`). Threshold 30px + debounce 800ms via `useRef<number>` pour éviter d'avancer plusieurs slides au moindre scroll. Pause auto-play temporairement après interaction.
- Avant : seul touch swipe / clavier / boutons / dots navigaient. Maintenant trackpad scroll fonctionne aussi.

### Fixed (translateX formula)

- **Slide carousel** (commit `cb813d0` push hier soir, mentioned ici pour traçabilité) : formule était `translateX(-index * 100%)` mais le track fait `width: count * 100%`, donc le `%` était relatif au track (= `count` viewports), pas au container. Corrigé en `translateX(-(index * 100 / count)%)`.

### Known issue — Tauri Node sidecar terminal sur macOS

Quand on lance le `.dmg` installé, une **fenêtre noire CLI sans menu apparaît peu après le launch** de l'app GEN MOTION et galère à se fermer quand on quitte l'app. C'est le Node sidecar (cf. `src-tauri/src/lib.rs:119-131` `spawn_next_sidecar`) qui crée une fenêtre Dock + un process group attaché. Pas bloquant fonctionnellement (l'app marche), juste cosmétique gênant.

**Fix prévu Sprint 16** : 2 options identifiées :
- Quick — wrapper Node binary dans Info.plist `LSUIElement=true` (background-only sur macOS)
- Proper — remplacer `app.shell().sidecar("node")` par `std::process::Command::new("node").process_group(0).spawn()` direct dans lib.rs (détache complètement le process group)

Pas applicable à v0.2.2, sera dans v0.2.3+.

### CI v0.2.1 résultats (pour mémoire)

Le tag v0.2.1 (premier vrai test des fixes Phase B Sprint 8) :
- ✅ macOS arm64 (macos-14) : success — `.dmg` bundled clean
- ✅ Windows (windows-latest) : success — premier `.msi` GEN MOTION (Phase B `desktop-fetch-binaries.mjs` rename → copyFile fix EXDEV validé)
- ❌ Ubuntu : failure — ffmpeg URL timeout (fixé en v0.2.2 → BtbN mirror)
- ⏳ macOS Intel (macos-13) : queued au moment du tag v0.2.2

3/4 jobs Phase B validés. Ubuntu sera le 4/4 au prochain tag v0.2.2.

---

## [0.2.1] — 2026-05-17

**Polish session post-v0.2.0** : commercialisation complète Studio Edition $49 via Stripe checkout end-to-end, domain genmotion.app live, pages légales FR RGPD-compliant, app icons next/og, update popup desktop, landing slides carrousel + direct download UX. La pipeline CI desktop-release.yml a été fixée Phase B (commit `968ed46`) pour les 3 plateformes qui avaient échoué au tag v0.2.0 — premier vrai test au prochain push de ce tag.

### Added (Sprint 14 — Direct download API + smart OS detection) · 2026-05-17

- **Route `/api/download/[platform]`** : fetch GitHub Releases API latest, find asset par regex pattern, 302 redirect direct vers `browser_download_url`. ISR cache 5min + stale-while-revalidate. Plateformes : `macos-arm64` (aarch64.dmg), `macos-intel` (x86_64.dmg), `macos` (arm64 fallback intel), `windows` (.msi/.exe), `linux-appimage` (.AppImage), `linux-deb` (.deb).
- **Composant `<SmartDownloadButton />`** client : détecte OS via `navigator.userAgent` + `navigator.platform`, propose le download direct du bon asset. macOS dispo, Windows/Linux disabled avec hint "Bientôt — disponible au prochain tag CI". Hint optionnel "macOS Apple Silicon · .dmg notarisé".
- **Propagé dans `/download` page + 3 slides landing** (Hero CTA + Pricing Community + CTA final) conditional sur `process.env.VERCEL`. Sur vitrine : DL direct macOS. Sur local dev : Link "Lancer le studio" → /dashboard.

### Added (Sprint 13 — Landing slides carrousel horizontal) · 2026-05-17

- **Refonte `src/app/page.tsx`** en mode slides immersif full-viewport : Hero · Démo · Comment ça marche · Pricing · CTA final.
- **`<SlidesCarousel />`** client : navigation flèches ← → + clavier + swipe touch + dots indicator + counter mono. Auto-play 5s pause-on-hover/focus/touch, resume 8s post-interaction.
- **Tous les slides en DOM** (CSS `translateX`) → SEO + accessibility friendly. `aria-roledescription`, `aria-current`, `aria-hidden` par slide.
- **Indications IA** pour Agent scraping : `data-wm-id="landing.slide.<name>"`, `data-tour-section="landing-slide-<name>"`, `data-tour-slide-index`.
- **Fix `cb813d0`** : formule `translateX` était `-index*100%` sur track de width `count*100%` → shiftait `count` viewports au lieu d'1. Corrigé en `-(index*100/count)%`.

### Added (Sprint 12 — Update popup desktop app) · 2026-05-17

- **Route `/api/version`** ISR 5min : wrap GitHub Releases API latest, return `{latest, releaseUrl, downloadUrl, notes, publishedAt, assets[]}`.
- **`<UpdateChecker />`** client mounted dans layout.tsx : 2s delay au mount, fetch genmotion.app/api/version, compare semver vs `NEXT_PUBLIC_APP_VERSION` (injecté build-time depuis `package.json` via `next.config.ts`). Si newer → floating card bottom-right 360px avec dot vert + version current → latest + notes excerpt + boutons "Voir la release" / "Plus tard".
- **Dismiss persistance** localStorage `webgen-motion:dismissed-update-version` keyed par version. Re-show seulement si release encore plus récente.
- **Skip silencieusement** sur hostname Vercel (genmotion.app, *.vercel.app) — pas d'update à proposer aux visiteurs de la vitrine.

### Added (Sprint 11 — Domain genmotion.app + icons + pages légales) · 2026-05-17

- **Domain swap** `webgen-motion.vercel.app` → **`genmotion.app`** dans `src/lib/stripe.ts` default URL + doc, `src/app/api/stripe/webhook/route.ts` doc, `src/app/layout.tsx` metadataBase + openGraph, `src/app/thanks/page.tsx` mention.
- **App icons next/og** (vire le favicon Vercel par défaut) :
  - `src/app/icon.tsx` 32×32 monogramme "GM" noir/blanc
  - `src/app/apple-icon.tsx` 180×180 "GM" blanc sur noir
  - `src/app/opengraph-image.tsx` 1200×630 share card avec wordmark + tagline + footer
  - `public/wordmark.svg` + `public/wordmark-studio.svg` backups statiques
- **Route `/wordmark-studio.png`** edge runtime : rasterize 512×512 le wordmark Studio Edition pour upload Stripe product image.
- **Pages légales FR RGPD-compliant** (réutilise pattern tempo) :
  - `src/lib/legal/config.ts` single source publisher (NDUI Smooth & Design, SIRET 904 264 223 000 10, Nice) + hosting Vercel + 4 subprocessors (Vercel, Stripe Europe, Anthropic BYOK, ElevenLabs BYOK) + jurisdiction + editions pricing
  - `src/app/(legal)/{layout,mentions-legales,confidentialite,cgu,cgv}/page.tsx`
  - `src/app/about/page.tsx` présentation Smooth & Design + section "Deux éditions"
- **Footer landing** : ajout liens légaux + "À propos" + label "Open-core MIT · 2026".
- Mention open-source courte + positive ("Open-source · MIT · made in Nice. GEN MOTION est sur GitHub. La Studio Edition débloque les outils pro.") dans README + about, sans paragraphe rationale technique (feedback Ben : pas mettre en avant le pavé fair-code).

### Added (Sprint 10 — Stripe checkout MVP one-time $49) · 2026-05-17

Studio Edition désormais **achetable** depuis la vitrine Vercel. Pipeline complet : visiteur clique "Acheter Studio Edition" → Stripe Checkout hosted (carte CB) → paiement → webhook → notification Discord à Ben → Ben run `scripts/issue-license.mjs` localement + email le `.license` au client (fulfillment manuel MVP-1).

- **Dependency** : `stripe` v22 (zero runtime config, juste env vars).
- **`src/lib/stripe.ts`** : `getStripe()` lazy + `getAppBaseUrl()` pour les success/cancel redirects.
- **Route POST `/api/stripe/checkout`** : crée Stripe Checkout Session one-time avec `STRIPE_PRICE_ID`, return `{url}`. Customer email capturé côté Stripe-hosted.
- **Route POST `/api/stripe/webhook`** : verify signature via `stripe.webhooks.constructEvent` (raw body lu via `req.text()` AVANT verify), gère `checkout.session.completed` → POST vers `WEBGEN_MOTION_DISCORD_WEBHOOK` avec email client + montant + session ID + commande prête à copier pour run `issue-license.mjs`. Indique `🟢 LIVE` ou `🟡 TEST` selon `event.livemode`.
- **Page `/thanks`** server component : fetch la session Stripe pour afficher email destinataire + montant + 3 steps (réception email, télécharge app, install license).
- **Composant `<BuyButton />`** réutilisable client : POST `/api/stripe/checkout` + `window.location.href` redirect Stripe.
- **UI buttons "Acheter Studio Edition · $49"** dans `/download` (secondary variant) + `/setup/license` (primary CTA).

#### Env vars Vercel requis (Settings → Environment Variables, production scope)

| Var | Source | Exemple |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | `sk_live_...` ou `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → endpoint → Signing secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Stripe Dashboard → Products → Studio Edition → Price ID | `price_...` |
| `WEBGEN_MOTION_DISCORD_WEBHOOK` | Discord channel → Settings → Integrations → Webhook URL | `https://discord.com/api/webhooks/...` |
| `NEXT_PUBLIC_APP_URL` | URL de prod | `https://genmotion.app` |

**Verified end-to-end** : Ben a fait un test paiement (mode test_) → Discord notif reçue avec commande prête à copier pour `issue-license.mjs`. Fulfillment manuel fonctionnel.

### Added (Sprint 9 — License key offline-first / Studio Edition commercialisable) · 2026-05-17

- **Ed25519 keypair system** (`scripts/generate-license-keypair.mjs`) : génère une paire de clés Ed25519 (PKCS8 private + SPKI public + 32-bytes raw base64). Ben run une fois pour sa prod key, garde le private OFFLINE, embed le public dans `src/lib/license/public-key.ts`. Support `--prefix dev-` pour des dev keys séparées du prod.
- **License file format PEM-style** (`src/lib/license/serialize.ts`) : `-----BEGIN WEBGEN-MOTION LICENSE v1-----` + ligne `<base64url(payload)>.<base64url(signature)>` + `-----END WEBGEN-MOTION LICENSE-----`. Payload JSON typé (`src/lib/license/types.ts` : `LicensePayload` = v, email, edition, issuedAt, expiresAt nullable pour perpetual, features whitelist optionnel, note optionnelle).
- **Verify module** (`src/lib/license/verify.ts`) : `verifyLicense(content) → {valid, payload?, error?}`. Utilise `crypto.verify(null, signedData, publicKey, signature)` Node natif (Ed25519, no hash arg). Cache mémoire keyed par sha256(content) pour pas re-verify à chaque `isFeatureEnabled` call. Reset via `resetLicenseCache()` après install/remove. Errors enum : malformed / bad-signature / unknown-version / expired / no-public-key.
- **Edition resolution refactor** (`src/lib/edition.ts`) : `resolveEdition()` returns `{edition, source, license?, licenseError?}`. Source priorité : env `WEBGEN_MOTION_EDITION` → `~/.webgen-motion/.license` (vérifié Ed25519) → fallback community. Le TODO Sprint future est résolu.
- **Issue CLI** (`scripts/issue-license.mjs`) : Ben backoffice tool. `--email --edition --expires perpetual|ISO --features csv? --note s? --output? --key keys/license-private.pem`. Charge private key PKCS8, sign + write `.license` PEM-style, print summary + path. Auto-output dans `issued/<email>-<ts>.license` (gitignored).
- **Route API** `/api/motion/license` (`route.ts` consolidé GET/POST/DELETE) : GET retourne `resolveEdition()`, POST `{content}` vérifie + écrit `~/.webgen-motion/.license` (mode 0600) + reset cache, DELETE supprime + reset cache. Toutes opérations locales, aucun appel réseau.
- **UI page** `/setup/license` (server component qui lit edition + delegates au client `LicenseForm`) : affiche edition active + source + license info (email, dates, features, note), warning si licenseError, textarea paste + boutons Install/Remove. Disabled si env override. Lien mailto contact@smoothandesign.fr pour acheter.
- **`.gitignore`** : `/keys/` (private keys) + `/issued/` (licenses émises, par sécurité même si pas critique).

### Verified E2E

- Valid perpetual license `email=alice@example.com edition=studio expires=perpetual` → `resolveEdition()` returns `edition: "studio", source: "license"`. `isFeatureEnabled("frames-3d")` → `true`, `isFeatureEnabled("sso")` → `false` (enterprise only).
- License `expires=2020-01-01` → `edition: community, source: default, licenseError: "expired"`.
- License signature corrompue → `edition: community, licenseError: "malformed"`.
- License removed → `edition: community, source: default`.

### Reste à brancher (Sprint 9 follow-up)

- **Génération prod keypair** : Ben doit `node scripts/generate-license-keypair.mjs` (sans `--prefix`), copier le base64 public output dans `src/lib/license/public-key.ts` (replace le DEV key actuellement embed), commit le swap, et garder `keys/license-private.pem` offline dans son coffre.
- **Nav link** : ajouter une entrée "License" dans `/setup` hub ou dashboard sidebar pour que les users trouvent `/setup/license`.

### Added (Sprint 10 — Stripe checkout MVP one-time $49) · 2026-05-17

Studio Edition désormais **achetable** depuis la vitrine Vercel. Pipeline complet : visiteur clique "Acheter Studio Edition" → Stripe Checkout hosted (carte CB) → paiement → webhook → notification Discord à Ben → Ben run `scripts/issue-license.mjs` localement + email le `.license` au client (fulfillment manuel MVP-1).

- **Dependency** : `stripe` v22 (zero runtime config, juste env vars).
- **`src/lib/stripe.ts`** : `getStripe()` lazy + `getAppBaseUrl()` pour les success/cancel redirects.
- **Route POST** `/api/stripe/checkout` : crée Stripe Checkout Session one-time avec `STRIPE_PRICE_ID`, return `{url}`. Customer email capturé sur l'écran Stripe-hosted.
- **Route POST** `/api/stripe/webhook` : verify signature Ed25519 via `stripe.webhooks.constructEvent`, gère `checkout.session.completed` → POST vers `WEBGEN_MOTION_DISCORD_WEBHOOK` avec email client + montant + session ID + commande prête à copier pour run `issue-license.mjs`. Indique `🟢 LIVE` ou `🟡 TEST` selon event.livemode.
- **Page `/thanks`** : server component qui fetch la session Stripe pour afficher l'email destinataire + montant + 3 steps (réception email, télécharge app, install license).
- **Composant `BuyButton`** réutilisable (client) : POST `/api/stripe/checkout` + `window.location.href` redirect Stripe.
- **UI buttons "Acheter Studio Edition · $49"** ajoutés dans `/download` (secondary variant à côté du Télécharger gratuit) + `/setup/license` (primary CTA dans la section "Pas encore de license"). Label mis à jour : "Open-core MIT · Community gratuit · Studio Edition $49 one-time perpetual".

#### Env vars Vercel à set (Settings → Environment Variables, production scope)

| Var | Source | Exemple |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | `sk_live_...` ou `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → endpoint → Signing secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Stripe Dashboard → Products → GEN MOTION Studio → Price ID | `price_...` |
| `WEBGEN_MOTION_DISCORD_WEBHOOK` | Discord channel → Settings → Integrations → Webhook URL | `https://discord.com/api/webhooks/...` |
| `NEXT_PUBLIC_APP_URL` | URL de prod | `https://webgen-motion.vercel.app` |

#### Setup Stripe Dashboard (à faire par Ben, 10 min)

1. Products → New product "GEN MOTION Studio Edition" → Price one-time $49 USD → note le `price_...` pour `STRIPE_PRICE_ID`
2. Developers → Webhooks → Add endpoint → URL `https://webgen-motion.vercel.app/api/stripe/webhook` → événement `checkout.session.completed` → note le `whsec_...` pour `STRIPE_WEBHOOK_SECRET`
3. Test en mode `sk_test_...` d'abord (passe une fake CB `4242 4242 4242 4242` n'importe quelle date/CVC), verify webhook fire dans Discord, OK → swap pour `sk_live_...`

#### Fulfillment workflow (MVP-1, manuel)

1. Client paie → Discord notif arrive avec email + commande copier-coller
2. Ben copie la commande, run dans son terminal local : `node scripts/issue-license.mjs --email <X> --edition studio --expires perpetual --note "Stripe <session_id>"`
3. Ben email le `.license` généré au client (path printé par le script)
4. Client install via `/setup/license` dans son app

#### Sprint 11+ candidate (post-MVP)

- **Auto-email license** : webhook → directement call `issue-license` inline → envoie via Resend/SendGrid. Pré-requis : prod keypair Ben stockée dans Vercel env (acceptable security pour MVP, à durcir HSM/KMS quand revenue justifie).
- **Page pricing dédiée** : `/pricing` avec features grid Community vs Studio vs Enterprise, FAQ, témoignages.
- **Refund flow** : Stripe Dashboard manuel pour MVP, automatisé v2.

---

## [0.2.0] — 2026-05-17

**Première version distribuable publique** sur macOS. `.dmg` signé + notarisé Apple + stapled + vérifié `spctl --assess`. CI workflow `desktop-release.yml` produit automatiquement les installers macOS arm64/x86_64, Windows et Linux à chaque push de tag `v*`.

### Added (Sprint 8 — Notarization Apple + CI signing) · 2026-05-17

- **Helper script `scripts/notarize-and-staple.mjs`** : pipeline end-to-end `build → submit Apple Notary → wait → staple .dmg + .app → verify (stapler validate + spctl --assess)`. Options `--skip-build` et `--dmg <path>`. `.env.local` optionnel (CI assume env vars déjà set). Discovery `.dmg` flexible (default + per-triple paths `target/<rust-triple>/release/bundle/dmg/`). Idempotent.
- **CI signing + notarize** : `.github/workflows/desktop-release.yml` injecte 6 secrets Apple (`APPLE_SIGNING_IDENTITY`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) sur le job macOS. Step `Notarize + staple (macOS)` post-build invoque notre helper avec `--skip-build`. Comment header documente les secrets GitHub requis.
- **Release notes auto-générées** : nouveau step CI extrait la section `## [X.Y.Z]` correspondante du CHANGELOG.md et la passe comme `releaseBody` à `tauri-action` (draft GitHub release pré-rempli avec les notes du tag).

### Notarized · 2026-05-17

- `webgen-motion_0.2.0_aarch64.dmg` (433 MB) Apple Notary **Accepted** (id `507f1160-fc5e-45b1-82f0-eaab734a8626`), stapled, `xcrun stapler validate` OK.
- `webgen-motion.app` Apple Notary **Accepted** (id `3a0774ec-c758-4e40-b681-f0e2e3f79483`), stapled, `spctl --assess` = `accepted source=Notarized Developer ID`.
- Bundle prune : **653 MB libérés** depuis `runners/node_modules` (next, @next, react-icons, @rspack, typescript, @tailwindcss, webpack, @swc, @img, lightningcss). 42 Mach-O binaries nested codesigned avec hardened runtime + secure timestamp + entitlements (allow-jit + disable-library-validation pour Chromium/Node sidecars).

### Known (ship as-is, polish futur)

- DMG `aarch64` 433 MB > cible 300 MB. Probablement Next standalone non-pruné ou assets Remotion. Acceptable pour v0.2.0, optimisation possible sprint futur.
- DMG `x86_64` (Intel Mac) à produire via CI matrix au push du tag v0.2.0 (le build local n'a fait que arm64 natif).
- Frames 3D toujours en **Beta expérimental** (cf. v0.1.7 Known Issues — rotations parasites non résolues). Badge UI + tooltips warning toujours actifs.

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
