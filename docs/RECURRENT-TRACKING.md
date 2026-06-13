# Récurrent + Tracking — GEN MOTION

> Plan d'industrialisation du passage **one-time → revenu récurrent**, et
> du **tracking** à brancher AVANT distribution. Décisions validées le
> 2026-06-13 (cf. mémoire monétisation).
>
> Ordre = ordre d'exécution. Les deux tracks (A tracking, B récurrent)
> avancent en parallèle ; A est plus rapide et débloque le pilotage.

---

## Décisions actées

- **Tiers** : Community gratuit · Studio **abo mensuel ~15€ / annuel ~120€** (2 mois offerts) **+ Lifetime ~199€** · Enterprise sur devis.
- **Licence abo** : **time-boxée + auto-refresh**. Ed25519 vérifiée OFFLINE, `expiresAt` = fin de période + grâce. L'app re-fetch une licence fraîche près de l'expiration. Lifetime = `expiresAt: null`.
- **Pas de DB** : **Stripe = source de vérité**. Refresh = vérifie licence → email → check abo actif Stripe → ré-émet.
- **Analytics** : **PostHog**, web public uniquement (jamais dans l'app desktop). North Star = **activation**, pas downloads.

---

## Track A — Tracking PostHog

### A.1 — Provider PostHog web-only `[S]`
- `posthog-js` + provider client, init **gardé** : skip si pas de clé, skip en contexte desktop (présence du meta `webgen-desktop-token` / `window.__TAURI__`), respect noindex/dev.
- Env : `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (EU `https://eu.i.posthog.com`).
- **Done** : pageviews web visibles dans PostHog, zéro event émis depuis l'app desktop.

### A.2 — Events de funnel `[S]`
- Helper `track(event, props)` no-op si PostHog absent.
- Câbler : `landing_view`, `download_click` (smart-download-button), `checkout_start` (buy-button), + provenance (`source`, `plan`).
- **Done** : funnel visite→download→checkout reconstituable dans PostHog.

### A.3 — Events serveur (checkout / fulfillment) `[S]`
- `posthog-node` côté webhook Stripe : `checkout_completed`, `license_issued`, `license_email_sent` (avec `plan`, `edition`, montant) — identify par email.
- **Done** : conversion payante trackée côté serveur (source de vérité = Stripe + PostHog).

### A.4 — Activation (North Star) `[M]`
- L'app desktop signale **une fois** la 1ʳᵉ compose réussie via un event opt-in minimal (anonyme, pas de contenu) — à concevoir dans le respect du local-first (opt-in explicite au /setup).
- **Done** : taux d'activation (installeurs qui composent un vrai 1ᵉʳ tour) mesurable.

---

## Track B — Récurrent (abo + licences time-boxées)

### B.1 — Prix Stripe abo + lifetime `[S]`
- Créer dans Stripe : `price` mensuel, `price` annuel (recurring), garder le one-time → renommer en **Lifetime**.
- Env : `STRIPE_PRICE_STUDIO_MONTHLY`, `_ANNUAL`, `_LIFETIME` (remplace `STRIPE_PRICE_ID`).
- **Done** : 3 prix résolvables côté serveur.

### B.2 — Checkout multi-plan `[M]`
- `/api/stripe/checkout` accepte `{ plan: "monthly" | "annual" | "lifetime" }` → `mode: "subscription"` (mensuel/annuel) ou `"payment"` (lifetime).
- **Done** : chaque plan ouvre la bonne session Stripe.

### B.3 — Émission time-boxée `[M]`
- fulfillment : `expiresAt` = `current_period_end + grâce` pour les abos ; `null` pour lifetime. Mappe `checkout.session` → plan/édition.
- **Done** : une licence d'abo expire à la fin de période ; lifetime perpétuelle.

### B.4 — Webhooks cycle de vie `[M]`
- Gérer `invoice.paid` (renouvellement → ré-émet + email la licence du nouveau cycle), `customer.subscription.deleted` / `updated` (annulation → laisse expirer, pas de refresh). Idempotent.
- **Done** : un renouvellement livre automatiquement une licence à jour.

### B.5 — Endpoint refresh `/api/license/refresh` `[M]`
- POST licence courante → vérifie signature → email → `stripe.subscriptions.list({ customer })` actif ? → ré-émet `expiresAt` = nouveau period_end. Lifetime → renvoie inchangé. Rate-limited.
- **Done** : un client avec abo actif obtient une licence fraîche sans humain.

### B.6 — Auto-refresh côté app `[M]`
- L'app vérifie l'expiration au lancement / périodiquement ; si proche (< N jours) et online → appelle refresh, remplace `~/.webgen-motion/.license`, `resetLicenseCache()`. **Grâce** de X jours si offline avant de dégrader vers Community.
- **Done** : l'utilisateur ne re-télécharge jamais sa licence à la main ; offline toléré.

### B.7 — Fix cache verify pour le time-boxing `[XS]`
- `verifyLicense` cache le verdict par hash → re-check `expiresAt` sur cache-hit (ou TTL court). Sinon un abo expiré reste "valid" tant que l'app tourne.
- **Done** : l'expiration prend effet même app ouverte.

### B.8 — UI pricing 3 paliers `[M]` (via skill frontend-design)
- `/download` + landing : cartes Community / Studio (toggle mensuel·annuel + Lifetime) / Enterprise. Respect du brand noir & blanc strict, pas d'icônes décoratives.
- **Done** : page de prix claire, CTA par plan branchés sur B.2.

---

## Pré-requis hors-code (Ben)

- `LICENSE_SIGNING_PRIVATE_KEY_B64` sur Vercel prod (sinon aucune licence émise).
- Projet PostHog créé + `NEXT_PUBLIC_POSTHOG_KEY`.
- Stripe en `sk_live_` + webhook live branché sur `…/api/stripe/webhook`.
- Lever le `noindex` du layout quand prêt à être référencé.
