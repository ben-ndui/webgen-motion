# Stripe Checkout : ce qu'il reste à faire

> Source unique des étapes restantes de l'intégration Stripe Checkout de GEN MOTION
> (réglages du Checkout Studio appliqués le 16/10/2026). Scénario A : un appel
> `stripe.checkout.sessions.create` existait déjà, seuls ses paramètres ont changé.

## Valeurs à remplacer

**Aucune.** Les paramètres « d'exemple » du Studio (`mode`, `success_url`, `cancel_url`,
`line_items`) existaient déjà dans le code avec de vraies valeurs, gardées telles quelles :

**Fichier :** [src/lib/stripe-session.ts](src/lib/stripe-session.ts)

| Champ | Valeur | D'où elle vient |
|-------|--------|-----------------|
| mode | `payment` (à vie) ou `subscription` (mensuel, annuel) | [src/lib/stripe-plans.ts](src/lib/stripe-plans.ts), selon l'offre choisie |
| success_url | `{base}/thanks?session_id={CHECKOUT_SESSION_ID}` | `getAppBaseUrl()` |
| cancel_url | `{base}/download` | `getAppBaseUrl()` |
| line_items[].price | prix Stripe de l'offre | variables Vercel `STRIPE_PRICE_STUDIO_MONTHLY`, `_ANNUAL`, `_LIFETIME` |

## Paramètres configurés

**Fichier :** [src/lib/stripe-session.ts](src/lib/stripe-session.ts), appelé par
[src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts)

| Paramètre | Valeur | Note |
|-----------|--------|------|
| ui_mode | `hosted_page` | SDK `stripe` 22.1.1 (≥ 21) |
| billing_address_collection | `auto` | |
| automatic_tax | `{ enabled: false }` | franchise de TVA, art. 293 B du CGI |
| allow_promotion_codes | `true` | les codes se créent dans le Dashboard (Produits, Coupons) |
| submit_type | `auto` | |
| saved_payment_method_options | `{ payment_method_save: "enabled" }` | achat à vie seulement |
| payment_method_collection | `always` | abonnements seulement |
| integration_identifier | `hosted_mobile_app_0001` | identifiant du Studio, gardé tel quel |
| origin_context | **`web`** | ⚠️ le Studio proposait `mobile_app` ; on paie depuis genmotion.app |
| phone_number_collection | **non posé** | ⚠️ le Studio l'activait : aucun usage, donnée personnelle de trop (RGPD) |

**Gardés en plus des réglages du Studio** (le prompt demandait de les retirer ; les
retirer cassait la vente) : `metadata` et `subscription_data.metadata` (l'offre, que la
licence et les renouvellements lisent, et la preuve d'achat professionnel exigée par les
CGV), `customer_creation` (sans client, pas d'email, donc pas de licence),
`payment_method_types: ["card"]`.

## Mise en place

- Variables Vercel (production) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_STUDIO_MONTHLY`, `STRIPE_PRICE_STUDIO_ANNUAL`, `STRIPE_PRICE_STUDIO_LIFETIME`.
  Aucune clé dans le code ni dans le dépôt.
- **À faire par Ben** : activer le **portail client** (Paramètres, Billing, Portail client,
  avec l'annulation d'abonnement autorisée) et poser son lien de connexion dans la variable
  Vercel `STRIPE_PORTAL_LOGIN_URL`. Sans lui, la résiliation passe par email
  ([src/app/(legal)/abonnement/page.tsx](src/app/(legal)/abonnement/page.tsx)).
- Le webhook existe déjà : [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)
  (`checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`).

## Comment ça marche

1. La page d'achat ([src/app/_components/studio-offer.tsx](src/app/_components/studio-offer.tsx))
   exige la case « achat professionnel », puis appelle `POST /api/stripe/checkout`.
2. La route refuse sans la case (400), crée la session avec `parametresDeLaSession()` et
   renvoie l'adresse de la page de paiement hébergée par Stripe.
3. Après paiement, le webhook émet la licence signée et l'envoie par email ; les
   renouvellements d'abonnement en émettent une nouvelle.

## Tester

- En mode test (clé `sk_test_…`), carte acceptée : `4242 4242 4242 4242`, date future
  quelconque, n'importe quel CVC. Authentification 3-D Secure : `4000 0027 6000 3184`.
  Refus : `4000 0000 0000 0002`.
- Les tests unitaires des paramètres : [src/lib/stripe-session.test.ts](src/lib/stripe-session.test.ts).

## Suite

- Créer des codes promo dans le Dashboard si besoin (`allow_promotion_codes` est actif).
- Ventes aux particuliers : impossible tant qu'un médiateur de la consommation n'est pas
  désigné (CGV réservées aux professionnels, décision du 16/10/2026).

## Ressources

- https://support.stripe.com
- https://docs.stripe.com/mcp
