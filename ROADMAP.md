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

### Sprint 2 — UX/UI tabs (en cours, 3/4 chunks done)

- ✅ Chunk 1 : page-header + tabs-strip + Script tab (édition VO inline + format selector + stats)
- ✅ Chunk 2 : Capture tab (action card + phase loader streaming NDJSON + sections grid + auto-load via status endpoint)
- ✅ Chunk 3 : Audio tab (MusicLibrary + sliders volumes) + Voice tab (Générer VO + counters + audio preview)
- ⏳ Chunk 4 : Compose tab (à venir)
- ⏳ Cleanup : extraire les last bits de l'ancien TourClient, retirer brand.ts, harmoniser icons (lucide-react partout)

---

## 🔜 Sprint 3 — distribution + meta-demo

- **CLAUDE.md** détaillé pour qu'un agent IA (Cursor / Claude Code / Copilot) puisse installer + configurer webgen-motion from scratch sur n'importe quel projet.
- **README enrichi** : screenshots + GIFs (capture en cours, avant/après compose, tab strip).
- **Setup wizard** : 4-5 écrans pour saisir API keys / voice ID / project URL / output dir via UI au lieu de `.env.local`. Config stockée dans `~/.webgen-motion/config.json`.
- **Meta-demo** : tour `webgen-motion-itself.json` qui film l'interface du Motion Studio elle-même → carte de visite ultime pour la promo.
- **`gh repo create ben-ndui/webgen-motion --public`** quand l'outil est polished.

---

## 🛠 Sprint 4+ — features avancées

### Visual tour editor (priorité haute après Sprint 3)
- Aujourd'hui : éditer un tour = écrire du JSON dans `tours/<id>.json`.
- Cible : UI form-based avec drag-drop des steps, ajout/suppression sans toucher au fichier. Save → écrit le JSON.
- Ce qui débloque : créer une vidéo promo pour un nouveau projet sans toucher à du code.

### Categories en JSON
- `motion-categories.ts` deviendra `categories.json` (sibling de `tours/`) → user peut définir ses propres palettes.
- Brand-pronunciation pareil : `pronunciation.json` éditable depuis la UI.

### Live preview sans re-capture
- Actuellement chaque modif de step = re-capture (~30s).
- Cible : preview "lite" qui charge le manifest existant + ré-applique uniquement les overlays / VO sans refilmer le site.
- Réduit le cycle d'itération à ~3s.

### Mobile app capture (4.D, ex-pivoté en option 3)
**Décidé en `/btw` (2026-05-10)** : skipped pour l'instant car Flutter web pas configuré sur uzme repo (le `web/` existe mais vide).
- **Path A** : Configurer Flutter web sur uzme (1-2 jours, partial — camera/notifs KO en web). Pas la peine pour l'instant.
- **Path B** (recommandé) : Maestro + iOS Simulator. Stack séparée du runner Puppeteer actuel — Maestro YAML scripts pour les interactions + `xcrun simctl io booted recordVideo` pour la capture. Output natif iPhone, fit dans iPhone frame du compose. ~2-3 jours.
- **Path C** : un wrapper qui embed la captured native MP4 dans le compose pipeline existant.

### Cursor mode polish
- Cursor + click ripple animé existent dans le runner mais jamais validé visuellement avec un tour qui a des clicks (deploys était admin-protégé).
- À retester avec un tour public ayant des clicks réels une fois qu'on a un projet candidat.

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
- Pré-requis : Sprint 3 + visual editor pour pas obliger le user à toucher au JSON

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
UZME est l'exemple canonique car il a un site responsive et une app prête. Mais le pipeline est totalement projet-agnostic — `tour.baseUrl` peut pointer ailleurs.

---

## ⏰ Cadence

- Sprint 2 chunks 4 → fin Sprint 2 : ~1-2h restantes
- Sprint 3 (CLAUDE.md + README + meta-demo) : ~1 jour
- Sprint 4 (visual editor) : ~3-4 jours
- Mobile app capture (Maestro) : ~2-3 jours quand Ben veut

Total avant SaaS-ready : **~1 semaine de boulot focused**.
