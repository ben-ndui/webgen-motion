# Test local de la chaîne Stripe (mode test)

> Valide **checkout → webhook → émission licence → email** en local, en
> mode test Stripe, **sans vraie carte ni vrai paiement**.
>
> Pré-requis : le bloc « TEST LOCAL » dans `.env.local` (prix test, signing
> key, Resend, `STRIPE_WEBHOOK_SECRET` auto-rempli via la CLI). Seule
> `STRIPE_SECRET_KEY` (sk_test) est à compléter à la main.

## 1. Compléter la clé secrète de test

Dashboard Stripe → **mode Test** → Developers → API keys → *Secret key* :

```
# .env.local
STRIPE_SECRET_KEY=sk_test_...
```

## 2. Deux terminaux

```bash
# Terminal A — l'app
npm run dev                     # http://localhost:3000

# Terminal B — forward des webhooks Stripe vers le local
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

> Le `whsec_` qu'affiche `stripe listen` est déjà dans `.env.local`
> (récupéré via `stripe listen --print-secret`) → la vérif de signature
> passe.

## 3. Déclencher un achat test

**Option A — vrai parcours (recommandé)**
1. http://localhost:3000/download → choisis un plan (Mensuel / Annuel / À vie)
2. Carte test : **4242 4242 4242 4242**, date future, CVC quelconque
3. **Mets ton vrai email** sur l'écran Stripe
4. Paiement → redirige sur `/thanks`

**Option B — event synthétique**
```bash
stripe trigger checkout.session.completed
```
(email = fixture Stripe, mode payment → licence perpétuelle ; moins réaliste
pour l'email)

## 4. Ce qu'on doit voir

- **Terminal B** : `checkout.session.completed [evt_...]` puis `POST … 200`
- **Terminal A** (logs serveur) : émission licence, envoi Resend
- **Ta boîte mail** : « Ta licence GEN MOTION … » + pièce jointe `.license`
- (Abo) la licence porte un `expiresAt` = fin de période + grâce ; (Lifetime)
  `expiresAt: null`

## 5. Tester le renouvellement (abo)

```bash
stripe trigger invoice.paid
```
→ le webhook ré-émet + ré-envoie une licence pour le nouveau cycle
(uniquement si `billing_reason = subscription_cycle`).

## Nettoyage

Le bloc « TEST LOCAL » de `.env.local` est local et gitignoré — retire-le
quand tu n'en as plus besoin (sinon l'app dev reste en mode test Stripe).
