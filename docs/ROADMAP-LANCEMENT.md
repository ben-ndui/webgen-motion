# Roadmap de lancement — GEN MOTION

> Objectif : **bétonner avant le lancement officiel**. Cette roadmap ne liste
> pas de nouvelles features — elle industrialise l'existant pour qu'il tienne
> en production, protège le revenu et réduise la surface de support.
>
> Basée sur la revue technique (`docs/REVUE-TECHNIQUE.md`, 2026-06-13).
> Ordre = ordre d'exécution. Ne pas lancer tant que P0 + P1 ne sont pas verts.

---

## Légende effort

- **XS** : < 1h · **S** : ~½ journée · **M** : 1-2 jours · **L** : 3-5 jours

---

## P0 — Sécurité (bloquant lancement)

### P0.1 — Garde « desktop-only / localhost » sur `api/motion/**`
- **Objectif** : aucune route pipeline (spawn de process, accès FS) ne doit
  être exécutable depuis le web public ni depuis une origine distante.
- **Actions** :
  - Middleware Next (`src/middleware.ts`) couvrant `/api/motion/:path*`.
  - Refus si runtime web public (`VERCEL` / `WEBGEN_PUBLIC_WEB`).
  - Allow-list de l'origine/Host (localhost, 127.0.0.1, `tauri.localhost`).
  - Token partagé optionnel injecté par le shell Tauri
    (`WEBGEN_DESKTOP_TOKEN` + header `x-webgen-desktop-token`), enforce quand
    présent — dégradation propre en dev.
  - Logique pure extraite + testée.
- **Done** : un POST sur `/api/motion/tour/run` depuis une origine non-locale
  ou en contexte Vercel renvoie 403 ; le workflow desktop/dev reste vert ;
  tests unitaires passent.
- **Effort** : **M**

### P0.2 — Validation/allow-list des chemins arbitraires
- **Objectif** : neutraliser la path traversal sur les inputs FS
  (`projectPath`, `outDir`, et tout champ chemin).
- **Actions** :
  - Helper `safe-path` : exige chemin absolu, normalise, rejette les null
    bytes / segments suspects, vérifie existence + type (dir/fichier).
  - Appliquer à `scaffold-from-project` et auditer les autres routes à chemin.
- **Done** : un `projectPath` malformé / traversal renvoie 400 ; tests passent.
- **Effort** : **S**

### P0.3 — Désactivation explicite du pipeline sur le déploiement public
- **Objectif** : ne plus dépendre de « scripts absents du trace » comme seule
  protection.
- **Actions** : variable `WEBGEN_PUBLIC_WEB` (ou détection `VERCEL`) qui coupe
  net les routes motion ; documenter dans le README/CLAUDE.md.
- **Done** : déploiement Vercel testé → routes motion 403.
- **Effort** : **XS** (couvert par P0.1)

---

## P1 — Tests business-critical + CI (bloquant lancement)

### P1.1 — Tests du cœur licence/édition
- **Objectif** : garantir que le gating payant ne casse pas en silence.
- **Actions** : tests `license/verify` (valide / signature falsifiée /
  expirée / mauvaise version / clé absente) et `edition` (résolution
  env/license/default, `isFeatureEnabled` par édition, override desktop
  ignoré).
- **Done** : suite verte couvrant ces cas ; un mutant qui ouvre Studio
  gratuitement fait échouer au moins un test.
- **Effort** : **M**

### P1.2 — Tests du webhook Stripe
- **Objectif** : empêcher fake events et régressions de fulfillment.
- **Actions** : tests signature invalide → 400, secret manquant → 500, event
  `checkout.session.completed` → notif déclenchée (mock fetch Discord).
- **Done** : suite verte ; signature falsifiée rejetée.
- **Effort** : **S**

### P1.3 — CI GitHub qualité
- **Objectif** : filet automatique sur chaque push/PR.
- **Actions** : workflow `ci.yml` → `npm ci`, `npm run lint`, `tsc --noEmit`,
  `npm run test:run`. Badge dans le README.
- **Done** : CI verte sur `main`, rouge si lint/type/test échoue.
- **Effort** : **S**

### P1.4 — Smoke test du pipeline
- **Objectif** : détecter une casse de bout en bout avant release.
- **Actions** : un test/scénario minimal capture→compose sur un tour fixture
  court (ou mock des binaires) qui vérifie la production d'un `final.mp4`.
- **Done** : commande unique qui valide le happy-path principal.
- **Effort** : **M**

---

## P2 — Automatisation fulfillment + durcissement secrets

### P2.1 — Émission de licence automatique post-paiement
- **Objectif** : supprimer l'étape Discord manuelle, livrer la licence en
  secondes.
- **Actions** : sur `checkout.session.completed` → signer le `.license`
  (réutiliser `issue-license`) → email au client (Resend) ; garder Discord en
  notification secondaire ; idempotence par `session.id`.
- **Done** : un paiement test génère et envoie automatiquement une licence
  valide vérifiable offline.
- **Effort** : **M**

### P2.2 — Durcissement du stockage des secrets
- **Objectif** : réduire l'exposition des clés locales.
- **Actions** : `chmod 0600` sur `config.json` à l'écriture ; masquer les clés
  dans tous les logs ; documenter la rotation ; rotation des credentials Apple
  actuels.
- **Done** : `config.json` écrit en 0600 ; aucune clé en clair dans les logs.
- **Effort** : **S**

### P2.3 — Clé privée de licence hors machine de build
- **Objectif** : protéger la clé de signature qui *est* le coffre du revenu.
- **Actions** : stocker la clé privée dans un secret manager / hors repo
  (déjà gitignored), documenter la procédure de signature, plan de révocation.
- **Done** : procédure écrite ; clé privée jamais sur disque non chiffré
  partagé.
- **Effort** : **S**

---

## P3 — Refactoring & resserrement du scope

### P3.1 — Découpage des gros fichiers
- **Objectif** : réduire la dette des fichiers > 700 lignes en les testant.
- **Actions** : découper `audio-tour.ts`, `capture-tour.ts`,
  `compose/[id]/page.tsx`, `useConsoleSession.ts`, `TourClient.tsx` en modules
  cohérents, ajouter des tests au passage.
- **Done** : aucun fichier source > ~500 lignes sans justification ; couverture
  ajoutée sur les modules extraits.
- **Effort** : **L**

### P3.2 — Resserrement du périmètre v1
- **Objectif** : un workflow « parfait » plutôt que dix à 80%.
- **Actions** : définir le golden path v1 (web → VO → compose 16:9), marquer
  explicitement « bêta » ou masquer les branches secondaires (mobile natif,
  OTIO, 3D) tant qu'elles ne sont pas testées/supportées.
- **Done** : la doc et l'UI distinguent clairement « stable » et « bêta ».
- **Effort** : **M**

### P3.3 — Mise à jour des dépendances + politique
- **Objectif** : rester à jour sans subir les ruptures bleeding-edge.
- **Actions** : rattraper les patchs mineurs en retard, activer Dependabot/
  Renovate, fixer une cadence de bump.
- **Done** : dépendances à jour ; bot configuré.
- **Effort** : **S**

---

## Définition de « prêt à lancer »

Le lancement officiel est autorisé **uniquement** quand **tout** ce qui suit
est vrai :

1. **P0 complet** : aucune route `api/motion/**` exécutable hors desktop local
   (testé : 403 depuis origine distante et contexte Vercel) ; chemins
   arbitraires validés contre la traversal.
2. **P1 complet** : licence, édition et webhook Stripe couverts par des tests
   qui échouent si le gating se casse ; CI verte exigée sur `main` ; smoke test
   pipeline au vert.
3. **P2.1 + P2.2** : un paiement déclenche une licence valide **sans
   intervention manuelle** ; secrets locaux en permissions restreintes.
4. **Aucune régression** : `npm run lint`, `tsc --noEmit`, `npm run test:run`
   verts ; workflow desktop manuel (capture → VO → compose) validé sur au
   moins un tour réel.
5. **Scope clair** : golden path v1 documenté ; branches non bétonnées
   marquées « bêta ».

P3 peut continuer **après** le lancement. P0 et P1 ne sont **pas
négociables** avant d'ouvrir les ventes au public.
