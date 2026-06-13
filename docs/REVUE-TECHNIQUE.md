# Revue technique — GEN MOTION (webgen-motion)

> Revue franche et sans complaisance du projet, réalisée le 2026-06-13.
> Périmètre : structure, stack, qualité de code, architecture, sécurité,
> tests, dépendances, viabilité produit.

---

## L'avis en une phrase

C'est un vrai produit, techniquement impressionnant et largement au-dessus
de la moyenne des side-projects — mais c'est un *one-man-show* dont la
fragilité est ailleurs que dans le code : tests quasi inexistants sur ce qui
rapporte de l'argent, sécurité qui tient par accident, et un périmètre
fonctionnel trop large pour une seule personne.

---

## Ce qui est vraiment bon

**Ambition et exécution sérieuses.** ~35 000 lignes, 210 commits propres en
conventional commits, un pipeline complet (capture Puppeteer → TTS
ElevenLabs/Voicebox → analyse audio FFmpeg → Edit Engine → compositing
Remotion → frames 3D R3F → export OTIO), packagé en app desktop Tauri
signée/notarisée Apple. Ce n'est pas une démo, c'est un produit fini.

**Discipline TypeScript remarquable.** Zéro `any` / `as any` dans tout
`src/`, seulement 4 TODO/FIXME sur l'ensemble du code. Beaucoup d'équipes pro
ne tiennent pas ce niveau.

**Système de licence bien pensé.** Ed25519 signé, vérifié offline (cohérent
avec le local-first), cache mémoire, et surtout le détail qui montre une vraie
réflexion sur l'abus : l'override `WEBGEN_MOTION_EDITION=studio` est
volontairement désactivé dès que l'app tourne en desktop packagé
(`WEBGEN_RUNNERS_DIR`), sinon n'importe qui débloquerait Studio gratuitement.
Le webhook Stripe vérifie correctement la signature. Les secrets ne sont
**jamais** entrés dans l'historique git (vérifié), et le `.gitignore` est
rigoureux (keys, *.pem, .env.local, target, standalone, binaries…).

**Documentation excellente.** README, CLAUDE.md, ROADMAP, modèle open-core
FSL clair. Le positionnement « vidéos produit as code, local-first » est net
et défendable.

---

## Ce qui est mauvais / fragile

### 1. La sécurité tient par accident, pas par design

~20 routes API (`src/app/api/motion/**`) exécutent des `spawn()` de child
processes et lisent des fichiers par chemin arbitraire fourni par le client
(ex. la route `scaffold-from-project` prend un `projectPath` absolu et ne
vérifie qu'`existsSync`, aucun allow-list ni protection traversal). Il n'y a
**aucun middleware ni garde server-side « desktop-only »** — `isDesktopRuntime()`
est purement côté client.

Ce qui empêche aujourd'hui qu'on déclenche ça depuis le web public
genmotion.app, c'est uniquement que `scripts/` est exclu du tracing Next, donc
le spawn échoue faute de scripts présents. C'est une défense *par accident de
packaging*. Le jour où la config de build change, on expose un vecteur RCE /
lecture de fichiers arbitraires sur le domaine public. **À corriger en
priorité.**

### 2. Zéro test sur ce qui protège le revenu

16 fichiers de test, presque tous sur des composants UI. **Aucun test** sur
`license/verify`, `edition` (le gating des features payantes), le webhook
Stripe, ni aucune route API. Pour un produit dont le modèle économique *est*
le gating Studio à $49, c'est le point le plus risqué : une régression
silencieuse sur `isFeatureEnabled` peut soit donner Studio gratuitement, soit
casser des licences payées, et rien ne préviendrait.

### 3. Pas de CI de qualité

Le seul workflow GitHub est la release desktop (`desktop-release.yml`). Aucun
lint/test/typecheck automatique sur push/PR. Avec un seul contributeur, c'est
le filet de sécurité qui manque le plus.

### 4. Clés API en clair

`config.json` stocke les clés ElevenLabs/Anthropic en plaintext via
`writeFileSync` sans `chmod 0600`. Acceptable pour du local-first sur la
machine de l'utilisateur, mais restreindre les permissions du fichier serait
trivial et propre. Idem, le `.env.local` local contient des credentials Apple
en clair — à considérer comme compromis si le dossier circule.

### 5. Fulfillment 100% manuel

Le webhook Stripe envoie un message Discord et l'on lance `issue-license.mjs`
à la main. OK pour valider, mais ça ne passe pas l'échelle et ça ajoute un
délai humain entre paiement et licence — friction directe sur la conversion.

---

## Ce qui mérite d'être refait / surveillé

Quelques fichiers deviennent des monstres : `audio-tour.ts` (1080 lignes),
`capture-tour.ts` (935), `compose/[id]/page.tsx` (824),
`useConsoleSession.ts` (794), `TourClient.tsx` (781). Pour le domaine c'est en
partie normal, mais ces fichiers concentrent la complexité et ne sont pas
testés — ce sont les premiers candidats au refactoring/découpage.

Stack **très bleeding-edge** (Next 16, React 19.2, Tailwind 4, Remotion 4,
Tauri 2). Bien tenue à jour (seulement des retards de patch mineurs), mais ça
expose aux ruptures amont et réduit l'aide de la communauté quand un bug
arrive.

---

## Recommandations priorisées

1. **Garde server-side explicite sur toutes les routes `api/motion/**`** :
   refuser toute requête hors runtime desktop local (origine localhost + token
   injecté par le shell Tauri), et valider/allow-lister les chemins
   (`projectPath`, `outDir`) contre la traversal. *Sécurité, urgent.*
2. **Tests sur le cœur business** : `verify.ts`, `edition.ts`, le webhook
   Stripe. Cibler « licence expirée / signature falsifiée / mauvaise
   édition ». *Protège le revenu.*
3. **CI GitHub** lint + typecheck + `vitest run` sur chaque push. *Filet de
   sécurité solo, ~30 min à mettre en place.*
4. **Automatiser l'émission de licence** post-paiement (Stripe → issue →
   email via Resend), supprimer l'étape Discord manuelle.
5. **Durcir le stockage des secrets** : `chmod 0600` sur `config.json`, et
   rotation des credentials Apple actuels.
6. **Découper progressivement** les 4-5 plus gros fichiers en les couvrant de
   tests au passage.

---

## Viabilité du produit

L'idée est bonne et le timing correct : « filme ton vrai site, ta voix clonée,
tout en local » répond à une vraie douleur (vidéos produit lentes/chères) avec
un angle local-first différenciant. La techno est là et fonctionne.

Le vrai risque n'est **pas technique, il est de périmètre** : le projet
construit, en solo, ce qu'une équipe de 4-5 personnes porterait (capture web +
mobile native, TTS cloud+local, montage auto, 3D, OTIO, desktop multi-OS,
licensing, agent IA…). C'est magnifique en démo, mais chaque branche est une
surface de bugs et de support à tenir seul.

Pour passer de « projet impressionnant » à « produit qui vit », il faut
resserrer : un workflow nickel (web → VO → compose 16:9), bétonné par des
tests et de la CI, plutôt que dix features à 80%. La distribution et le funnel
de conversion seront le mur, pas le code.

**En résumé** : le code fait honneur ; c'est l'industrialisation (tests du
business-critical, garde de sécurité, CI, automatisation du fulfillment) et la
discipline de scope qui feront la différence entre un superbe portfolio et un
produit rentable.
