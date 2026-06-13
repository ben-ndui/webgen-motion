# SEO / SEA — GEN MOTION (genmotion.app)

> État du référencement naturel (SEO) et de l'acquisition payante (SEA),
> ce qui est posé en prod, et la checklist des actions hors-code (côté Ben).
> Mis à jour le 2026-06-13.

---

## 1. SEO technique — en place & vérifié en prod

| Élément | Détail |
|---|---|
| Indexation | `noindex` levé → `<meta robots="index, follow">` + `googleBot` (max-image-preview:large, max-snippet:-1) |
| `robots.txt` | `genmotion.app/robots.txt` — marketing autorisé, écrans app exclus (`/dashboard`, `/setup`, `/tour`, `/compose`, `/console`, `/notary`, `/thanks`, `/api`), pointe le sitemap |
| `sitemap.xml` | `genmotion.app/sitemap.xml` — 8 pages publiques avec priorités |
| Canonical | par page (`/`, `/download`, `/about`) |
| OpenGraph | title/desc/url/site_name/locale + **image 1200×630** (`opengraph-image.tsx`) |
| Twitter Card | `summary_large_image` + image + alt |
| Données structurées | **JSON-LD `SoftwareApplication`** + 4 `Offer` (0/15/120/199 €) + `Organization` (sur `/`) |
| Title template | `%s · GEN MOTION` (pages enfants) |
| Pages app | double protection : `robots.txt` disallow **+** `noindex` meta propre |
| Légal | section Cookies alignée RGPD (PostHog UE **sous consentement**) |

Source : `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`,
`src/app/page.tsx` (JSON-LD), pages `download`/`about`.

---

## 2. Meta posées (référence)

- **Title** : `GEN MOTION — Vidéos produit as code, régénérées à chaque release`
- **Description** : `GEN MOTION rejoue ton produit (web ou app native), pose la voix off, monte sur la musique — et le refait à l'identique après chaque release. Local-first · Fair-code FSL · Studio à vie ou en abonnement.`
- **OG / Twitter title** : `GEN MOTION — Vidéos produit as code`
- **OG / Twitter desc** : `Tes vidéos produit, écrites comme du code. Régénérées à chaque release. En local.`
- **Keywords** : `vidéo produit`, `motion design`, `screencast`, `démo produit`, `voix off IA`, `local-first`, `Remotion`, `alternative Screen Studio`, `alternative Tella`, `video as code`

> Pour modifier : `src/app/layout.tsx` (`export const metadata`).

---

## 3. Tracking de conversion (commun SEO/SEA)

| Event | Où | État |
|---|---|---|
| `$pageview` | web, après consentement | PostHog (no-op tant que clé absente) |
| `download_click` | `SmartDownloadButton` | ✅ |
| `checkout_start` | `BuyButton` (avec `plan`) | ✅ |
| `checkout_completed` / `license_issued` / `license_email_sent` | webhook Stripe (serveur) | ✅ |
| `subscription_renewed` | webhook `invoice.paid` | ✅ |
| **`purchase_completed`** | `/thanks` (client) | ✅ — **point d'ancrage du tag de conversion publicitaire** |

👉 Le pixel **Google Ads / Meta** se pose dans `src/app/_components/purchase-tracker.tsx`
(emplacement déjà commenté). Donne-moi l'ID de conversion et je branche le `gtag`.

---

## 4. SEA — clusters de mots-clés (Google Ads)

**Intention "outil" (haute valeur)**
- logiciel démo produit · créer vidéo démo produit · outil screencast automatique
- générateur vidéo produit · logiciel vidéo onboarding

**Concurrents (conquête)**
- alternative Screen Studio · alternative Tella · alternative Arcade
- alternative Descript démo · alternative Supademo

**Use-case**
- vidéo onboarding produit · vidéo de release / changelog · démo SaaS automatisée
- vidéo produit pour agence · vidéo feature announcement

**Angle local-first (différenciateur, peu concurrencé)**
- montage vidéo local sans cloud · démo produit sous NDA · vidéo produit offline

**Négatifs à ajouter** (éviter le gaspillage) : `gratuit`, `tutoriel`, `capcut`,
`premiere`, `after effects`, `freelance`, `emploi`, `télécharger film`.

---

## 5. Angles d'annonces (USP à pousser)

Ce que les concurrents SaaS **ne disent pas** — à mettre en titre/description d'annonce :

- **« À vie, pas un abonnement à subir »** (Lifetime 199 € vs ~456 $/an SaaS)
- **« 100% local — tes démos clients sous NDA ne quittent jamais ta machine »**
- **« Régénérée à chaque release »** (le produit change → la vidéo se rejoue à l'identique)
- **« Voix off clonée + montage calé sur les beats, automatiquement »**

CTA : *Télécharger (gratuit)* → la Community fait l'aimant, l'upsell Studio se fait dans l'app.

---

## 6. Checklist actions hors-code (Ben)

**SEO**
- [ ] **Google Search Console** : ajouter `genmotion.app`, vérifier (DNS ou meta — me donner le code et je le pose dans `layout.tsx > verification.google`), **soumettre** `https://genmotion.app/sitemap.xml`
- [ ] **Bing Webmaster Tools** (optionnel) : même principe
- [ ] Vérifier le rendu de l'**image OG** (partage LinkedIn/X) — soigner le visuel si besoin
- [ ] PostHog : poser `NEXT_PUBLIC_POSTHOG_KEY` + `POSTHOG_KEY` sur Vercel (sinon tout le funnel reste no-op) + redeploy

**SEA**
- [ ] Créer le compte **Google Ads** + une **action de conversion** (Achat) → me donner l'ID, je branche le `gtag` sur `/thanks`
- [ ] (Optionnel) **Meta Ads** : pixel au même endroit (`purchase-tracker.tsx`)
- [ ] Lier Google Ads ↔ Search Console ↔ (Analytics) pour les rapports croisés
- [ ] Démarrer sur 2 campagnes : 1 *conquête concurrents*, 1 *intention outil* — petit budget, optimiser sur `purchase_completed`

---

## 7. North Star & mesure

- **North Star = activation** (1ʳᵉ vidéo composée), pas les downloads. Trackée
  anonymement (opt-out) → funnel `download → install → activation`.
- **Stripe = source de vérité** MRR / churn / LTV (que le one-time ne donnait pas).
- Pilote l'achat d'ads sur le **coût par `purchase_completed`**, pas par clic.
